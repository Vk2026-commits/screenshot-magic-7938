-- Weekly webinar reminder automation for "Build Your First AI Income Stream".
-- Apply after supabase/webinar.sql. The separate scheduler migration is applied
-- only after the send-webinar-reminders Edge Function is deployed.

create table if not exists public.webinar_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.webinar_registrations(id) on delete cascade,
  reminder_key text not null check (
    reminder_key in (
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
  resend_email_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (registration_id, reminder_key)
);

create index if not exists webinar_reminder_deliveries_status_scheduled_idx
  on public.webinar_reminder_deliveries (status, scheduled_for);

alter table public.webinar_reminder_deliveries enable row level security;
revoke all on public.webinar_reminder_deliveries from public, anon, authenticated;
grant all on public.webinar_reminder_deliveries to service_role;

-- Holds only the SHA-256 digest of the private scheduler token. The raw token
-- remains in Supabase Vault and is never stored in source control or exposed to
-- the public Edge Function endpoint.
create table if not exists public.webinar_automation_settings (
  setting_key text primary key,
  value_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.webinar_automation_settings enable row level security;
revoke all on public.webinar_automation_settings from public, anon, authenticated;
grant all on public.webinar_automation_settings to service_role;

create or replace function public.claim_webinar_reminder_delivery(
  p_registration_id uuid,
  p_reminder_key text,
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
  insert into public.webinar_reminder_deliveries (
    registration_id,
    reminder_key,
    scheduled_for,
    status,
    attempts,
    updated_at
  ) values (
    p_registration_id,
    p_reminder_key,
    p_scheduled_for,
    'processing',
    1,
    now()
  )
  on conflict (registration_id, reminder_key) do nothing;

  if found then
    return 'claimed';
  end if;

  select status, updated_at
  into v_status, v_updated_at
  from public.webinar_reminder_deliveries
  where registration_id = p_registration_id
    and reminder_key = p_reminder_key
  for update;

  if v_status = 'sent' then
    return 'sent';
  end if;

  if v_status = 'processing' and v_updated_at > now() - interval '10 minutes' then
    return 'processing';
  end if;

  update public.webinar_reminder_deliveries
  set status = 'processing',
      attempts = attempts + 1,
      failure_reason = null,
      scheduled_for = p_scheduled_for,
      updated_at = now()
  where registration_id = p_registration_id
    and reminder_key = p_reminder_key;

  return 'claimed';
end;
$$;

revoke all on function public.claim_webinar_reminder_delivery(uuid, text, timestamptz) from public;
grant execute on function public.claim_webinar_reminder_delivery(uuid, text, timestamptz) to service_role;

-- Generate the raw scheduler token inside Supabase Vault if it does not already
-- exist. The scheduled HTTP request reads this Vault secret; the Edge Function
-- compares a SHA-256 digest to the private settings row above.
do $$
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'webinar_reminder_cron_secret'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'webinar_reminder_cron_secret',
      'Private token used only by the weekly webinar reminder scheduler'
    );
  end if;
end;
$$;

insert into public.webinar_automation_settings (setting_key, value_hash, updated_at)
select
  'webinar_reminder_cron_token_sha256',
  encode(extensions.digest(decrypted_secret, 'sha256'), 'hex'),
  now()
from vault.decrypted_secrets
where name = 'webinar_reminder_cron_secret'
on conflict (setting_key) do update
  set value_hash = excluded.value_hash,
      updated_at = now();
