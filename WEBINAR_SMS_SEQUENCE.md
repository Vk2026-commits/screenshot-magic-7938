# Build Your First AI Income Stream — SMS Sequence

## Delivery model

- **Sender:** Vektiss webinar SMS agent via the dedicated Retell/Twilio line.
- **Eligibility:** A registrant must actively select the SMS-consent checkbox on the registration page. Consent is stored with timestamp and source before any SMS is considered.
- **Cadence:** At most **7 automated texts per webinar registration**, plus any replies in the two-way conversation.
- **No catch-up sends:** A person receives only messages whose scheduled time occurs after registration.
- **Idempotency:** Every text is claimed and recorded in a private delivery ledger before sending; retries cannot create duplicates.
- **Opt-out / help:** Every scheduled message includes `Reply STOP to opt out`; the agent is configured to respond to `STOP` / `HELP` consistently.
- **Release gate:** The runtime SMS secrets remain intentionally unset until this copy is reviewed and approved.

## SMS copy for review

| Key               | Timing                                   | Copy                                                                                                                                                                               |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registration`    | Immediately after consented registration | `Hi {{first_name}}, you’re registered for Build Your First AI Income Stream on {{session_date}} at 7:00 PM Central. Join live: {{join_url}} Reply STOP to opt out, HELP for help.` |
| `tomorrow`        | Saturday, 7:00 PM Central                | `Reminder: Build Your First AI Income Stream is tomorrow at 7 PM Central. Plan to join 5–10 min early: {{join_url}} Reply STOP to opt out.`                                        |
| `today`           | Sunday, 10:00 AM Central                 | `Tonight at 7 PM Central: Build Your First AI Income Stream. Bring one income idea or problem to work on. Join: {{join_url}} Reply STOP to opt out.`                               |
| `one_hour`        | Sunday, 6:00 PM Central                  | `We start in 1 hour. Open Zoom and join 5–10 min early: {{join_url}} Reply STOP to opt out.`                                                                                       |
| `ten_minutes`     | Sunday, 6:50 PM Central                  | `We start in 10 min. Join Zoom now: {{join_url}} Reply STOP to opt out.`                                                                                                           |
| `live_now`        | Sunday, 7:00 PM Central                  | `We’re live now—join Build Your First AI Income Stream: {{join_url}} Reply STOP to opt out.`                                                                                       |
| `replay_followup` | Monday, 9:00 AM Central                  | `Thanks for registering for Build Your First AI Income Stream. Watch the replay here: {{replay_url}} Reply STOP to opt out.`                                                       |

## Intentional differences from email

- The Wednesday “choose your focus” email has **no companion SMS**, keeping the text cadence respectful.
- Monday’s replay text only sends after a secure replay URL is configured.
- The email sequence remains the long-form value channel; SMS is only for critical attendance and access reminders.

## Remaining launch inputs

1. Approve the SMS copy above, including the claim that up to seven automated texts may be sent.
2. Confirm that the selected Retell/Twilio line has the required A2P SMS approval.
3. Set the protected Retell runtime secrets in Supabase after approval.
4. Configure the replay URL before Monday’s replay message is eligible.
