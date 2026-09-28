# Build Your First AI Income Stream — Email Sequence & Launch Checklist

**Webinar:** Every Sunday, 7:00 PM Central
**Host:** Ricky Rose
**Registration page:** https://screenshot-magic-7938.lovable.app/
**Primary audience:** AI Income Path Finder leads and direct webinar registrants

## Current funnel status

| Stage                  | Current behavior                                                                                         | Status                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Path Finder completion | Stores lead and assessment, then sends a personalized plan email                                         | Active                                                                         |
| Plan email             | Includes a webinar registration CTA that carries the lead and assessment references                      | Active                                                                         |
| Webinar registration   | Matches the lead by email, records attribution, assigns the correct Sunday, and prevents duplicate seats | Active once the live frontend deployment has the Funnel 1 client configuration |
| Immediate confirmation | Sends a branded Resend email with the assigned date/time and Zoom join button                            | Active once the live frontend deployment has the Funnel 1 client configuration |
| Delivery protection    | Stores send status and makes confirmation delivery idempotent                                            | Active                                                                         |
| Reminder sequence      | Day-before, one-hour, and ten-minute reminders                                                           | Not built yet                                                                  |
| Post-webinar follow-up | Attendee/no-show follow-ups, replay, and offer sequence                                                  | Not built yet                                                                  |

## Email copy and timing

### 1. Path Finder result email — already active

**Trigger:** A person completes the AI Income Path Finder.
**Subject:** `Your AI Income Path: [recommended path]`

**Purpose:** Deliver their personalized outcome, then make the live training the logical next step.

**Current CTA:** `Reserve your free seat`

**Recommended positioning:**

> Your assessment helps answer, “Where should I start?”
> The live training helps answer, “How do I turn that path into real income?”

This is a good handoff. It is specific, reinforces why the webinar matters, and does not make the plan email feel like a hard sell.

### 2. Registration confirmation — already active

**Trigger:** A successful webinar signup.
**Subject:** `You’re registered: Build Your First AI Income Stream — [Sunday date]`

**Core copy:**

> [First name], you’re registered. Your seat is confirmed for Ricky Rose’s live online training.

**Includes:**

- Webinar name
- Assigned Sunday date
- 7:00 PM Central
- Zoom join button
- Reminder to save the email

**Recommended small improvement:** Add a one-click calendar attachment/link. It reduces missed sessions without increasing email volume.

### 3. Day-before reminder — recommended

**Timing:** Saturday, 7:00 PM Central (24 hours before)

**Subject options:**

- `Tomorrow at 7 PM Central: your AI Income training`
- `Your seat is saved for tomorrow`

**Draft:**

> Hi [First name],
>
> A quick reminder: **Build Your First AI Income Stream** is tomorrow at **7:00 PM Central**.
>
> We’ll cover how to identify a practical AI income path based on what you already know, find something people will pay for, and decide what to build first.
>
> [Join the live training]
>
> Save this email so your Zoom link is ready tomorrow.

**CTA:** `Join the live training`

### 4. One-hour reminder — recommended

**Timing:** Sunday, 6:00 PM Central

**Subject options:**

- `We start in 1 hour`
- `Starting at 7 PM Central — join us live`

**Draft:**

> Hi [First name],
>
> We begin in **one hour**.
>
> Bring a notebook and come ready to identify the fastest path from your current skills to a useful AI-powered offer.
>
> [Join the live training]

**CTA:** `Join now`

### 5. Ten-minute reminder — recommended

**Timing:** Sunday, 6:50 PM Central

**Subject:** `We start in 10 minutes`

**Draft:**

> We start in 10 minutes.
>
> [Join Build Your First AI Income Stream]

Keep this short. The entire job is to get the registrant into Zoom.

### 6. Attendee follow-up — recommended

**Timing:** Sunday evening or Monday morning

**Subject options:**

- `Your next step after the live training`
- `Here’s how to turn the training into action`

**Draft direction:** Thank them for attending, restate the one core framework, and make **one** clear next-step offer. The offer can be a strategy call, implementation service, paid program, or a more focused assessment—choose only one.

**Needed from Ricky:** The exact primary offer, price/qualification if relevant, and destination URL.

### 7. No-show follow-up — recommended

**Timing:** Monday morning

**Subject options:**

- `Sorry we missed you — here’s your next step`
- `Couldn’t make the live training?`

**Draft direction:** Do not guilt the recipient. If there is a replay, provide a deadline and one clear CTA. If no replay exists, offer the next Sunday registration directly.

**Needed from Ricky:** Whether a replay will be available, its URL, and its viewing deadline.

## Recommendation for the first live session

For the initial launch, use this minimum sequence:

1. Personalized Path Finder email with webinar CTA
2. Immediate registration confirmation with Zoom link
3. Saturday 7:00 PM Central reminder
4. Sunday 6:00 PM Central reminder
5. Sunday 6:50 PM Central reminder
6. Monday no-show or attendee follow-up

This is enough to improve show-up rates without overwhelming a new audience.

## Operational decisions to make before automated reminders

| Decision                                   | Why it matters                                                                                                          | Recommended default                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Recurring Zoom room vs. weekly unique link | The current join URL is tied to a dated meeting. A new weekly link requires a secure secret update before each session. | Use one recurring Zoom meeting with the same protected link, waiting room enabled, and host admission controls.              |
| Calendar support                           | Increases attendance and reduces “I forgot” excuses.                                                                    | Add an `.ics` calendar attachment or download link to the confirmation email and thank-you page.                             |
| Replay policy                              | Determines the no-show message and follow-up CTA.                                                                       | Decide whether replay access lasts 24–72 hours.                                                                              |
| Post-webinar offer                         | Determines the attendee and replay email CTA.                                                                           | One offer only—avoid multiple competing next steps.                                                                          |
| Reply-to address                           | Makes attendee questions easier to handle.                                                                              | Use a monitored business inbox.                                                                                              |
| Marketing consent and unsubscribe          | Required for promotional follow-up in many jurisdictions and good deliverability practice.                              | Keep transactional webinar logistics separate; add a clear consent/unsubscribe path before any ongoing promotional sequence. |
| Sender reputation                          | Protects inbox placement.                                                                                               | Keep volume low at launch, use the verified sender, and monitor Resend delivery events.                                      |

## Automation choices for scheduled reminders

| Approach                                              | Tradeoffs                                                                                                                                                                         | Cost                                                                 | Setup complexity          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| **Scheduled email jobs in the existing app/database** | Fully automatic; registrants receive reminders based on their assigned Sunday; can track sends and avoid duplicates. Needs one durable scheduled job and a small reminder ledger. | Low ongoing infrastructure cost; email-provider usage still applies. | Moderate, one-time build. |
| **Manual weekly broadcast in Resend**                 | Fastest launch path; Ricky controls each send. Easy to make mistakes, does not automatically filter people by their assigned Sunday, and is harder to scale.                      | Email-provider usage only.                                           | Low.                      |

**Recommendation:** Start with the manual weekly broadcast for the first one or two live sessions only if you need to launch immediately. Then add the scheduled reminder system before scaling paid traffic or recurring promotions.

## Pre-launch checklist

- [ ] Confirm the live webinar page can save a registration to Funnel 1.
- [ ] Confirm the confirmation email arrives in a real inbox and its Zoom button opens the meeting correctly.
- [ ] Confirm Zoom waiting room/passcode/host controls are enabled.
- [ ] Add calendar support.
- [ ] Decide replay policy and upload/link the replay if applicable.
- [ ] Decide the one post-webinar offer and destination URL.
- [ ] Add the reminder system or prepare the manual reminder sends.
- [ ] Add privacy policy and terms links to the registration page.
- [ ] Add a monitored reply-to inbox.
- [ ] Verify Meta/analytics conversion tracking for `webinar_registration` without exposing personal data.

## Current blocker

The current published webinar client bundle must include the Funnel 1 public Supabase configuration. Once the latest GitHub deployment reaches the live site, run a real registration with a monitored inbox and confirm delivery before promoting the page.
