-- Webinar registrations for "Build Your First AI Income Stream".
-- Run AFTER supabase/schema.sql. Safe to re-run.

create table if not exists public.webinar_registrations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  first_name text,
  email text not null,
  phone text,
  webinar_name text not null default 'Build Your First AI Income Stream',
  session_date date not null,
  session_time text not null default '7:00 PM',
  timezone text not null default 'America/Chicago',
  registration_status text not null default 'registered',
  assessment_id uuid references public.income_assessments(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referral_url text,
  landing_page_url text,
  created_at timestamptz not null default now()
);

-- One registration per lead per Sunday; many Sundays over time.
create unique index if not exists webinar_registrations_lead_session_key
  on public.webinar_registrations (lead_id, webinar_name, session_date);

grant all on public.webinar_registrations to service_role;
alter table public.webinar_registrations enable row level security;
-- No anon policies: writes go only through register_for_webinar().

create or replace function public.register_for_webinar(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p->>'email'));
  v_lead uuid;
  v_assessment uuid;
  v_id uuid;
  v_central timestamp := now() at time zone 'America/Chicago';
  v_days_until_sunday integer;
  v_session_date date;
begin
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[a-z]{2,}$' then
    raise exception 'invalid email';
  end if;
  if coalesce(trim(p->>'first_name'), '') = '' then
    raise exception 'first name required';
  end if;

  -- The browser shows this date, but the database is authoritative: Sunday
  -- registrations after 7:00 PM Central apply to the following week's session.
  v_days_until_sunday := (7 - extract(dow from v_central)::integer) % 7;
  if extract(dow from v_central)::integer = 0 and v_central::time >= time '19:00' then
    v_days_until_sunday := 7;
  end if;
  v_session_date := v_central::date + v_days_until_sunday;

  -- Existing lead by normalized email (never trust a passed lead_id alone).
  select id into v_lead from public.leads where email = v_email;

  if v_lead is null then
    insert into public.leads (
      first_name, email, phone,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referral_url, landing_page_url
    ) values (
      trim(p->>'first_name'), v_email, nullif(trim(p->>'phone'), ''),
      p->>'utm_source', p->>'utm_medium', p->>'utm_campaign', p->>'utm_content', p->>'utm_term',
      p->>'referral_url', p->>'landing_page_url'
    )
    returning id into v_lead;
  else
    -- Fill gaps only; keep original attribution of the existing lead.
    update public.leads set
      phone = coalesce(phone, nullif(trim(p->>'phone'), '')),
      first_name = coalesce(nullif(first_name, ''), trim(p->>'first_name')),
      updated_at = now()
    where id = v_lead;
  end if;

  -- Only link an assessment that belongs to this lead.
  if nullif(p->>'assessment_id', '') is not null then
    begin
      select id into v_assessment from public.income_assessments
       where id = (p->>'assessment_id')::uuid and lead_id = v_lead;
    exception when invalid_text_representation then
      v_assessment := null;
    end;
  end if;

  insert into public.webinar_registrations (
    lead_id, first_name, email, phone, webinar_name, session_date, session_time, timezone,
    assessment_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referral_url, landing_page_url
  ) values (
    v_lead, trim(p->>'first_name'), v_email, nullif(trim(p->>'phone'), ''),
    'Build Your First AI Income Stream', v_session_date, '7:00 PM', 'America/Chicago',
    v_assessment, p->>'utm_source', p->>'utm_medium', p->>'utm_campaign', p->>'utm_content', p->>'utm_term',
    p->>'referral_url', p->>'landing_page_url'
  )
  on conflict (lead_id, webinar_name, session_date) do update set
    phone = coalesce(excluded.phone, webinar_registrations.phone),
    assessment_id = coalesce(webinar_registrations.assessment_id, excluded.assessment_id),
    registration_status = 'registered'
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_for_webinar(jsonb) from public;
grant execute on function public.register_for_webinar(jsonb) to anon, authenticated;

-- WEBINAR EMAIL DELIVERIES ---------------------------------------------
-- Private server-side ledger for the registration confirmation email. It
-- prevents duplicate Zoom invitations if a browser retries a completed signup.
create table if not exists public.webinar_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.webinar_registrations(id) on delete cascade,
  status text not null default 'pending',
  attempts int not null default 0,
  resend_email_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.webinar_email_deliveries
  add column if not exists registration_id uuid references public.webinar_registrations(id) on delete cascade,
  add column if not exists status text default 'pending',
  add column if not exists attempts int default 0,
  add column if not exists resend_email_id text,
  add column if not exists failure_reason text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists sent_at timestamptz;

create unique index if not exists webinar_email_deliveries_registration_id_key
  on public.webinar_email_deliveries (registration_id);

alter table public.webinar_email_deliveries enable row level security;
revoke all on public.webinar_email_deliveries from public, anon, authenticated;
grant all on public.webinar_email_deliveries to service_role;

create or replace function public.claim_webinar_registration_email(p_registration_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_updated_at timestamptz;
begin
  insert into public.webinar_email_deliveries (
    registration_id, status, attempts, updated_at
  )
  values (p_registration_id, 'processing', 1, now())
  on conflict (registration_id) do nothing;

  if found then
    return 'claimed';
  end if;

  select status, updated_at
  into v_status, v_updated_at
  from public.webinar_email_deliveries
  where registration_id = p_registration_id
  for update;

  if v_status = 'sent' then
    return 'sent';
  end if;

  if v_status = 'processing' and v_updated_at > now() - interval '10 minutes' then
    return 'processing';
  end if;

  update public.webinar_email_deliveries
  set status = 'processing',
      attempts = coalesce(attempts, 0) + 1,
      failure_reason = null,
      updated_at = now()
  where registration_id = p_registration_id;

  return 'claimed';
end;
$$;

revoke all on function public.claim_webinar_registration_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_webinar_registration_email(uuid) to service_role;
