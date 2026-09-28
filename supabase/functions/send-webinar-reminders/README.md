# Weekly Webinar Reminder Automation

`send-webinar-reminders` is a protected scheduled Edge Function for **Build Your First AI Income Stream**.

## What it sends

For each registrant’s assigned Sunday, it sends only the messages whose send time is still **after** that person’s registration:

| Key               | Central Time send point | Purpose                                                                    |
| ----------------- | ----------------------- | -------------------------------------------------------------------------- |
| `choose_focus`    | Wednesday, 10:00 AM     | Ask the registrant to choose one problem or goal to bring to the training. |
| `tomorrow`        | Saturday, 7:00 PM       | Day-before reminder and preparation.                                       |
| `today`           | Sunday, 10:00 AM        | Re-state the live-session promise.                                         |
| `one_hour`        | Sunday, 6:00 PM         | Ask the registrant to open Zoom and join early.                            |
| `ten_minutes`     | Sunday, 6:50 PM         | Short access reminder.                                                     |
| `live_now`        | Sunday, 7:00 PM         | Live-now Zoom access message.                                              |
| `replay_followup` | Monday, 9:00 AM         | Replay follow-up; only sends after a valid replay URL is configured.       |

Every send is recorded in `public.webinar_reminder_deliveries`, which prevents duplicate emails when the scheduler retries.

## Secure scheduling

1. Apply `supabase/webinar-reminders.sql`.
2. Deploy this Edge Function with `verify_jwt: false`.
3. Apply `supabase/webinar-reminders-schedule.sql`.

The schedule runs every five minutes through Supabase Cron. It invokes the function with a random token generated inside Supabase Vault. The function compares only a SHA-256 digest stored in a private table, so the raw scheduler token is not committed to GitHub or exposed to the browser.

## Required existing secrets

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `WEBINAR_JOIN_URL`

## Required before Monday replay follow-up

| Secret               | Purpose                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `WEBINAR_REPLAY_URL` | HTTPS URL for the replay CTA. The function skips the replay follow-up until this is present, rather than sending a broken link. |

## Recommended optional footer settings

| Secret                     | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `BUSINESS_MAILING_ADDRESS` | Mailing address displayed in reminder-email footer. |
| `PRIVACY_POLICY_URL`       | HTTPS privacy-policy link.                          |
| `UNSUBSCRIBE_URL`          | HTTPS unsubscribe/preference-center link.           |

## Safe validation

Send a protected request with `{ "dryRun": true }`. The response lists currently due candidates without claiming a delivery or sending an email.
