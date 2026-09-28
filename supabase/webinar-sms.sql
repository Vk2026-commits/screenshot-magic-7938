-- Webinar SMS consent and delivery tracking for "Build Your First AI Income Stream".
-- Apply after supabase/webinar.sql and supabase/webinar-reminders.sql.

alter table public.webinar_registrations
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists sms_opted_in_at timestamptz,
  add column if not exists sms_opt_in_source text;

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
  v_sms_opt_in boolean := lower(coalesce(p->>'sms_opt_in', 'false')) in ('true', 't', '1', 'yes', 'on');
begin
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[a-z]{2,}$' then
    raise exception 'invalid email';
  end if;
  if coalesce(trim(p->>'first_name'), '') = '' then
    raise exception 'first name required';
  end if;

  v_days_until_sunday := (7 - extract(dow from v_central)::integer) % 7;
  if extract(dow from v_central)::integer = 0 and v_central::time >= time '19:00' then
    v_days_until_sunday := 7;
  end if;
  v_session_date := v_central::date + v_days_until_sunday;

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
    update public.leads set
      phone = coalesce(phone, nullif(trim(p->>'phone'), '')),
      first_name = coalesce(nullif(first_name, ''), trim(p->>'first_name')),
      updated_at = now()
    where id = v_lead;
  end if;

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
    referral_url, landing_page_url, sms_opt_in, sms_opted_in_at, sms_opt_in_source
  ) values (
    v_lead, trim(p->>'first_name'), v_email, nullif(trim(p->>'phone'), ''),
    'Build Your First AI Income Stream', v_session_date, '7:00 PM', 'America/Chicago',
    v_assessment, p->>'utm_source', p->>'utm_medium', p->>'utm_campaign', p->>'utm_content', p->>'utm_term',
    p->>'referral_url', p->>'landing_page_url', v_sms_opt_in,
    case when v_sms_opt_in then now() else null end,
    case when v_sms_opt_in then 'webinar_registration_form' else null end
  )
  on conflict (lead_id, webinar_name, session_date) do update set
    phone = coalesce(excluded.phone, webinar_registrations.phone),
    assessment_id = coalesce(webinar_registrations.assessment_id, excluded.assessment_id),
    sms_opt_in = webinar_registrations.sms_opt_in or v_sms_opt_in,
    sms_opted_in_at = case
      when webinar_registrations.sms_opted_in_at is null and v_sms_opt_in then now()
      else webinar_registrations.sms_opted_in_at
    end,
    sms_opt_in_source = case
      when webinar_registrations.sms_opt_in_source is null and v_sms_opt_in then 'webinar_registration_form'
      else webinar_registrations.sms_opt_in_source
    end,
    registration_status = 'registered'
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_for_webinar(jsonb) from public;
grant execute on function public.register_for_webinar(jsonb) to anon, authenticated;

create table if not exists public.webinar_sms_deliveries (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.webinar_registrations(id) on delete cascade,
  message_key text not null check (
    message_key in (
      'registration',
      'choose_focus',
      'tomorrow',
      'today',
      'one_hour',
      'ten_minutes',
      'live_now',
      'replay_followup'
    )
  ),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0,
  retell_chat_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (registration_id, message_key)
);

create index if not exists webinar_sms_deliveries_status_scheduled_idx
  on public.webinar_sms_deliveries (status, scheduled_for);

alter table public.webinar_sms_deliveries enable row level security;
revoke all on public.webinar_sms_deliveries from public, anon, authenticated;
grant all on public.webinar_sms_deliveries to service_role;

create or replace function public.claim_webinar_sms_delivery(
  p_registration_id uuid,
  p_message_key text,
  p_scheduled_for timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_updated_at timestamptz;
begin
  insert into public.webinar_sms_deliveries (
    registration_id,
    message_key,
    scheduled_for,
    status,
    attempts,
    updated_at
  ) values (
    p_registration_id,
    p_message_key,
    p_scheduled_for,
    'processing',
    1,
    now()
  )
  on conflict (registration_id, message_key) do nothing;

  if found then
    return 'claimed';
  end if;

  select status, updated_at
  into v_status, v_updated_at
  from public.webinar_sms_deliveries
  where registration_id = p_registration_id
    and message_key = p_message_key
  for update;

  if v_status = 'sent' then
    return 'sent';
  end if;

  if v_status = 'processing' and v_updated_at > now() - interval '10 minutes' then
    return 'processing';
  end if;

  update public.webinar_sms_deliveries
  set status = 'processing',
      attempts = attempts + 1,
      failure_reason = null,
      scheduled_for = p_scheduled_for,
      updated_at = now()
  where registration_id = p_registration_id
    and message_key = p_message_key;

  return 'claimed';
end;
$$;

revoke all on function public.claim_webinar_sms_delivery(uuid, text, timestamptz) from public;
grant execute on function public.claim_webinar_sms_delivery(uuid, text, timestamptz) to service_role;
