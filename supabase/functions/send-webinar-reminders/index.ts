import { createClient } from "npm:@supabase/supabase-js@2";

type ReminderKey =
  | "choose_focus"
  | "tomorrow"
  | "today"
  | "one_hour"
  | "ten_minutes"
  | "live_now"
  | "replay_followup";

type Registration = {
  id: string;
  first_name: string | null;
  email: string | null;
  webinar_name: string | null;
  session_date: string | null;
  session_time: string | null;
  timezone: string | null;
  created_at: string | null;
};

type ReminderSlot = {
  key: ReminderKey;
  scheduledFor: Date;
  graceMinutes: number;
};

type EmailMessage = {
  subject: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
};

const CHICAGO_TIMEZONE = "America/Chicago";
const SETTINGS_KEY = "webinar_reminder_cron_token_sha256";
const PROCESSING_WINDOW_MINUTES = 10;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function safeHttpsUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function chicagoParts(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CHICAGO_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function chicagoDate(date: Date) {
  const parts = chicagoParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** Converts a non-ambiguous Central Time date/time to an instant, including DST. */
function chicagoDateTime(date: string, hour: number, minute: number) {
  const [year, month, day] = date.split("-").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let timestamp = desiredAsUtc;

  // Two adjustments are sufficient for the daylight-saving transition dates.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const local = chicagoParts(new Date(timestamp));
    const localAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    timestamp += desiredAsUtc - localAsUtc;
  }

  return new Date(timestamp);
}

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sessionDateLabel(value: string | null) {
  const date = value ? new Date(`${value}T12:00:00Z`) : null;
  if (!date || Number.isNaN(date.valueOf())) return "this Sunday";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function friendlyTime(registration: Registration) {
  const time = registration.session_time ?? "7:00 PM";
  const timezone =
    registration.timezone === CHICAGO_TIMEZONE
      ? "Central Time"
      : (registration.timezone ?? "Central Time");
  return `${time} ${timezone}`;
}

function reminderSlots(sessionDate: string): ReminderSlot[] {
  return [
    {
      key: "choose_focus",
      scheduledFor: chicagoDateTime(shiftIsoDate(sessionDate, -4), 10, 0),
      graceMinutes: 360,
    },
    {
      key: "tomorrow",
      scheduledFor: chicagoDateTime(shiftIsoDate(sessionDate, -1), 19, 0),
      graceMinutes: 360,
    },
    { key: "today", scheduledFor: chicagoDateTime(sessionDate, 10, 0), graceMinutes: 300 },
    { key: "one_hour", scheduledFor: chicagoDateTime(sessionDate, 18, 0), graceMinutes: 90 },
    { key: "ten_minutes", scheduledFor: chicagoDateTime(sessionDate, 18, 50), graceMinutes: 25 },
    { key: "live_now", scheduledFor: chicagoDateTime(sessionDate, 19, 0), graceMinutes: 20 },
    {
      key: "replay_followup",
      scheduledFor: chicagoDateTime(shiftIsoDate(sessionDate, 1), 9, 0),
      graceMinutes: 72 * 60,
    },
  ];
}

function messageFor(
  key: ReminderKey,
  registration: Registration,
  joinUrl: string,
  replayUrl: string | null,
): EmailMessage | null {
  const firstName = registration.first_name?.trim() || "there";
  const webinarName = registration.webinar_name ?? "Build Your First AI Income Stream";
  const sessionDate = sessionDateLabel(registration.session_date);
  const sessionTime = friendlyTime(registration);

  switch (key) {
    case "choose_focus":
      return {
        subject: "Choose ONE thing before Sunday’s AI Income training",
        paragraphs: [
          `Hi ${firstName},`,
          "Before Sunday, think about the one thing you want AI to help you solve right now.",
          "Maybe it is creating a first offer, finding more leads, turning an existing skill into a service, creating content faster, saving time in your business, or choosing an AI income path that actually fits your life.",
          "Bring that one problem with you. The more specific you are about what you want to fix, build, or improve, the more useful the training will be.",
          "We’ll show you how to connect a real problem to a practical offer—and use AI to help you deliver it faster.",
          "See you Sunday,\nRicky",
        ],
        ctaLabel: "Keep your Zoom link handy",
        ctaUrl: joinUrl,
      };
    case "tomorrow":
      return {
        subject: `Tomorrow at 7 PM Central: ${webinarName}`,
        paragraphs: [
          `Hi ${firstName},`,
          `A quick reminder: ${webinarName} is tomorrow, ${sessionDate}, at ${sessionTime}.`,
          "We’ll cover how to identify an AI income path that fits your skills and available time, find a problem people will actually pay to solve, turn what you already know into a useful offer, and decide what to build first.",
          "Save this email and plan to join 5–10 minutes early.",
          "— Ricky",
        ],
        ctaLabel: "Join the live Zoom training",
        ctaUrl: joinUrl,
      };
    case "today":
      return {
        subject: `Tonight at 7 PM Central: ${webinarName}`,
        paragraphs: [
          `Hi ${firstName},`,
          `We’re live tonight at ${sessionTime}.`,
          "Bring one specific goal, problem, or income idea with you. You do not need everything figured out before you join—you just need a starting point.",
          "By the end of the training, you should have a clearer idea of the AI income path that makes sense for you and the first action to take.",
          "— Ricky",
        ],
        ctaLabel: "Save your Zoom link",
        ctaUrl: joinUrl,
      };
    case "one_hour":
      return {
        subject: "We start in 1 hour",
        paragraphs: [
          `Hi ${firstName},`,
          "We begin in one hour.",
          "Open your Zoom link now and plan to join 5–10 minutes early so you are settled before we start. Bring a notebook and the one problem you want AI to help you solve.",
          "See you soon,\nRicky",
        ],
        ctaLabel: "Join the live Zoom training",
        ctaUrl: joinUrl,
      };
    case "ten_minutes":
      return {
        subject: "We start in 10 minutes",
        paragraphs: [
          `Hi ${firstName},`,
          "We start in 10 minutes. Your Zoom link is below.",
          "See you inside,\nRicky",
        ],
        ctaLabel: "Join now",
        ctaUrl: joinUrl,
      };
    case "live_now":
      return {
        subject: `We’re live — join ${webinarName} now`,
        paragraphs: [`Hi ${firstName},`, "We’re live now.", "See you inside,\nRicky"],
        ctaLabel: "Join the live Zoom training",
        ctaUrl: joinUrl,
      };
    case "replay_followup":
      if (!replayUrl) return null;
      return {
        subject: `Your replay: ${webinarName}`,
        paragraphs: [
          `Hi ${firstName},`,
          "Yesterday’s live training was about choosing a useful AI income path—not chasing every tool or opportunity at once.",
          "Watch the replay, then choose one valuable problem you can solve with what you already know and one small next step you can take this week.",
          "The replay is available below.",
          "— Ricky",
        ],
        ctaLabel: "Watch the replay",
        ctaUrl: replayUrl,
      };
  }
}

function footerHtml() {
  const mailingAddress = Deno.env.get("BUSINESS_MAILING_ADDRESS")?.trim();
  const privacyUrl = safeHttpsUrl(Deno.env.get("PRIVACY_POLICY_URL"));
  const unsubscribeUrl = safeHttpsUrl(Deno.env.get("UNSUBSCRIBE_URL"));
  const lines = ["You received this email because you registered for the AI Income Training."];
  if (mailingAddress) lines.push(mailingAddress);
  if (privacyUrl || unsubscribeUrl) {
    const links = [
      privacyUrl
        ? `<a href="${escapeHtml(privacyUrl)}" style="color:#5b6474">Privacy policy</a>`
        : null,
      unsubscribeUrl
        ? `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6474">Unsubscribe</a>`
        : null,
    ].filter(Boolean);
    lines.push(links.join(" &nbsp;·&nbsp; "));
  }

  return `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e7eaf0;color:#6b7280;font-size:12px;line-height:1.6">${lines
    .map((line) => `<div>${line.includes("<a ") ? line : escapeHtml(line)}</div>`)
    .join("")}</div>`;
}

function renderEmail(firstName: string, message: EmailMessage) {
  const safeFirstName = escapeHtml(firstName.trim() || "there");
  const paragraphs = message.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;color:#283244;font-size:16px;line-height:1.65;white-space:pre-line">${escapeHtml(paragraph)}</p>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f6f8;color:#182033;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden">
          <tr><td style="background:#0f1f3d;padding:24px 32px"><p style="margin:0;color:#9fd4ff;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">AI Income Training</p></td></tr>
          <tr><td style="padding:32px">
            <h1 style="margin:0 0 20px;color:#182033;font-size:26px;line-height:1.25">${safeFirstName}, here’s your webinar update.</h1>
            ${paragraphs}
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#1674c4"><a href="${escapeHtml(message.ctaUrl)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:16px;font-weight:700;line-height:1;text-decoration:none">${escapeHtml(message.ctaLabel)}</a></td></tr></table>
            ${footerHtml()}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function renderText(message: EmailMessage) {
  return [...message.paragraphs, "", `${message.ctaLabel}: ${message.ctaUrl}`].join("\n\n");
}

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function equalHash(a: string, b: string) {
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Reminder function is missing Supabase service configuration.");
    return Response.json(
      { ok: false, error: "Reminder automation is not configured." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const suppliedToken = request.headers.get("x-webinar-reminder-secret")?.trim();
  if (!suppliedToken) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data: setting, error: settingError } = await supabase
    .from("webinar_automation_settings")
    .select("value_hash")
    .eq("setting_key", SETTINGS_KEY)
    .maybeSingle<{ value_hash: string }>();

  if (
    settingError ||
    !setting?.value_hash ||
    !equalHash(await sha256(suppliedToken), setting.value_hash)
  ) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const webinarJoinUrl = safeHttpsUrl(Deno.env.get("WEBINAR_JOIN_URL"));
  const webinarReplayUrl = safeHttpsUrl(Deno.env.get("WEBINAR_REPLAY_URL"));
  if (!resendApiKey || !resendFromEmail || !webinarJoinUrl) {
    console.error("Reminder function is missing email delivery configuration.");
    return Response.json(
      { ok: false, error: "Reminder email delivery is not configured." },
      { status: 500 },
    );
  }

  let dryRun = false;
  try {
    const body = (await request.json()) as { dryRun?: unknown };
    dryRun = body?.dryRun === true;
  } catch {
    // An empty JSON body is valid for the scheduled invocation.
  }

  const now = new Date();
  const localToday = chicagoDate(now);
  const rangeStart = shiftIsoDate(localToday, -7);
  const rangeEnd = shiftIsoDate(localToday, 7);
  const { data: registrations, error: registrationsError } = await supabase
    .from("webinar_registrations")
    .select("id, first_name, email, webinar_name, session_date, session_time, timezone, created_at")
    .eq("registration_status", "registered")
    .gte("session_date", rangeStart)
    .lte("session_date", rangeEnd)
    .limit(1000);

  if (registrationsError) {
    console.error(
      "Could not load webinar registrations for reminder delivery.",
      registrationsError,
    );
    return Response.json({ ok: false, error: "Reminder lookup failed." }, { status: 500 });
  }

  const result = {
    ok: true,
    dryRun,
    checked: registrations?.length ?? 0,
    candidates: [] as Array<{ registrationId: string; key: ReminderKey; scheduledFor: string }>,
    sent: 0,
    alreadyHandled: 0,
    skipped: 0,
    failed: 0,
  };

  for (const registration of (registrations ?? []) as Registration[]) {
    if (!registration.id || !registration.email || !registration.session_date) continue;
    const registeredAt = registration.created_at ? new Date(registration.created_at) : null;

    for (const slot of reminderSlots(registration.session_date)) {
      const scheduledTimestamp = slot.scheduledFor.getTime();
      const ageMinutes = (now.getTime() - scheduledTimestamp) / 60_000;
      if (ageMinutes < 0 || ageMinutes > slot.graceMinutes) continue;
      if (registeredAt && registeredAt.getTime() >= scheduledTimestamp) continue;

      const message = messageFor(slot.key, registration, webinarJoinUrl, webinarReplayUrl);
      if (!message) {
        // Replay publishing is intentionally a prerequisite for the Monday email.
        console.warn("Replay follow-up skipped until WEBINAR_REPLAY_URL is configured.");
        result.skipped += 1;
        continue;
      }

      result.candidates.push({
        registrationId: registration.id,
        key: slot.key,
        scheduledFor: slot.scheduledFor.toISOString(),
      });
      if (dryRun) continue;

      const { data: claimStatus, error: claimError } = await supabase.rpc(
        "claim_webinar_reminder_delivery",
        {
          p_registration_id: registration.id,
          p_reminder_key: slot.key,
          p_scheduled_for: slot.scheduledFor.toISOString(),
        },
      );

      if (claimError || !claimStatus) {
        console.error("Could not claim webinar reminder delivery.", claimError);
        result.failed += 1;
        continue;
      }
      if (claimStatus !== "claimed") {
        result.alreadyHandled += 1;
        continue;
      }

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `webinar-reminder-${registration.id}-${slot.key}`,
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [registration.email.trim().toLowerCase()],
          subject: message.subject,
          html: renderEmail(registration.first_name ?? "", message),
          text: renderText(message),
          tags: [
            { name: "funnel", value: "ai_income_webinar" },
            { name: "reminder", value: slot.key },
            { name: "registration_id", value: registration.id },
          ],
        }),
      });

      const resendPayload = (await resendResponse.json().catch(() => null)) as {
        id?: unknown;
      } | null;
      if (!resendResponse.ok || typeof resendPayload?.id !== "string") {
        console.error("Resend rejected a webinar reminder.", {
          key: slot.key,
          status: resendResponse.status,
        });
        await supabase
          .from("webinar_reminder_deliveries")
          .update({
            status: "failed",
            failure_reason: `Resend returned HTTP ${resendResponse.status}`,
            updated_at: new Date().toISOString(),
          })
          .eq("registration_id", registration.id)
          .eq("reminder_key", slot.key);
        result.failed += 1;
        continue;
      }

      await supabase
        .from("webinar_reminder_deliveries")
        .update({
          status: "sent",
          resend_email_id: resendPayload.id,
          failure_reason: null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("registration_id", registration.id)
        .eq("reminder_key", slot.key);
      result.sent += 1;
    }
  }

  return Response.json(result);
});
