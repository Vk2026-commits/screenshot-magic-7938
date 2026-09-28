-- Apply after webinar-reminders.sql and after deploying the
-- send-webinar-reminders Edge Function. Runs every five minutes; the function
-- uses America/Chicago and each registration's assigned Sunday to decide which
-- message is due, so this UTC cron expression stays correct across DST.

create extension if not exists pg_cron;

-- The project URL is public, but storing it in Vault keeps the scheduler query
-- self-contained and avoids hard-coding it in the cron job body.
do $$
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'webinar_reminder_project_url'
  ) then
    perform vault.create_secret(
      'https://bkmbgyhrldolybyuebwj.supabase.co',
      'webinar_reminder_project_url',
      'Funnel 1 URL for the weekly webinar reminder scheduler'
    );
  end if;
end;
$$;

-- Safe to re-run: replace the previous scheduler definition.
select cron.unschedule(jobid)
from cron.job
where jobname = 'send-webinar-reminders-every-five-minutes';

select cron.schedule(
  'send-webinar-reminders-every-five-minutes',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'webinar_reminder_project_url'
      ) || '/functions/v1/send-webinar-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webinar-reminder-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'webinar_reminder_cron_secret'
        )
      ),
      body := '{}'::jsonb
    ) as request_id;
  $cron$
);
