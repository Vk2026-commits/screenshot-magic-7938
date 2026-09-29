-- Functional, recipient-specific unsubscribe flow for the webinar email sequence.
-- Apply after supabase/webinar.sql.

create table if not exists public.webinar_email_unsubscribe_tokens (
  email text primary key,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webinar_email_opt_outs (
  email text primary key,
  opted_out_at timestamptz not null default now(),
  source text not null default 'unsubscribe_page'
);

alter table public.webinar_email_unsubscribe_tokens enable row level security;
alter table public.webinar_email_opt_outs enable row level security;
revoke all on public.webinar_email_unsubscribe_tokens from public, anon, authenticated;
revoke all on public.webinar_email_opt_outs from public, anon, authenticated;
grant all on public.webinar_email_unsubscribe_tokens to service_role;
grant all on public.webinar_email_opt_outs to service_role;

-- Called only by server-side Edge Functions. The page never receives an email
-- address; it receives only the opaque per-recipient UUID in its URL.
create or replace function public.get_webinar_email_unsubscribe_token(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_token uuid;
begin
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[a-z]{2,}$' then
    raise exception 'invalid email';
  end if;

  insert into public.webinar_email_unsubscribe_tokens (email, updated_at)
  values (v_email, now())
  on conflict (email) do update
    set updated_at = now()
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.get_webinar_email_unsubscribe_token(text) from public, anon, authenticated;
grant execute on function public.get_webinar_email_unsubscribe_token(text) to service_role;

-- Called from the public unsubscribe confirmation page. It returns only a
-- boolean, preventing the page from enumerating or exposing email addresses.
create or replace function public.unsubscribe_webinar_email(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email
  into v_email
  from public.webinar_email_unsubscribe_tokens
  where token = p_token;

  if v_email is null then
    return false;
  end if;

  insert into public.webinar_email_opt_outs (email, opted_out_at, source)
  values (v_email, now(), 'unsubscribe_page')
  on conflict (email) do update
    set opted_out_at = public.webinar_email_opt_outs.opted_out_at;

  return true;
end;
$$;

revoke all on function public.unsubscribe_webinar_email(uuid) from public;
grant execute on function public.unsubscribe_webinar_email(uuid) to anon, authenticated;
