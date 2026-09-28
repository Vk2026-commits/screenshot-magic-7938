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
