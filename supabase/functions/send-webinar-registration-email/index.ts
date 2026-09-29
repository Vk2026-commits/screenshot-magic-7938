import { createClient } from "npm:@supabase/supabase-js@2";

type WebinarEmailRequest = {
  registrationId?: unknown;
};

type WebinarRegistration = {
  id: string;
  first_name: string | null;
  email: string | null;
  webinar_name: string | null;
  session_date: string | null;
  session_time: string | null;
  timezone: string | null;
};

const defaultOrigin = "https://webinar.vektiss.com";
const defaultOrigins = [
  defaultOrigin,
  "https://screenshot-magic-7938.lovable.app",
  "https://income.vektiss.com",
];
const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const trustedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

function corsHeaders(origin: string | null) {
  const allowOrigin =
    origin && trustedOrigins.includes(origin) ? origin : (trustedOrigins[0] ?? defaultOrigin);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(origin: string | null, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(origin) });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
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

function calendarDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replaceAll("-", "") : null;
}

function centralDateTime(value: string | null, hour: number) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  let timestamp = desiredAsUtc;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(timestamp))
        .map((part) => [part.type, part.value]),
    );
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    timestamp += desiredAsUtc - localAsUtc;
  }

  return new Date(timestamp);
}

function calendarLinks(params: {
  sessionDate: string | null;
  webinarName: string;
  joinUrl: string;
}) {
  const date = calendarDate(params.sessionDate);
  const startDate = centralDateTime(params.sessionDate, 19);
  const endDate = centralDateTime(params.sessionDate, 20);
  if (!date || !startDate || !endDate) return null;

  const compactUtc = (value: Date) =>
    value
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const details = `${params.webinarName}\n\nJoin Zoom: ${params.joinUrl}`;
  const google = new URL("https://calendar.google.com/calendar/render");
  google.search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.webinarName,
    dates: `${compactUtc(startDate)}/${compactUtc(endDate)}`,
    ctz: "America/Chicago",
    details,
    location: "Zoom",
  }).toString();

  const outlook = new URL("https://outlook.office.com/calendar/0/deeplink/compose");
  outlook.search = new URLSearchParams({
    subject: params.webinarName,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: details,
    location: "Zoom",
  }).toString();

  return { google: google.toString(), outlook: outlook.toString() };
}

function calendarInvitation(params: {
  registrationId: string;
  sessionDate: string | null;
  webinarName: string;
  joinUrl: string;
}) {
  const date = calendarDate(params.sessionDate);
  if (!date) return null;

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const escapeIcsText = (value: string) =>
    value
      .replaceAll("\\", "\\\\")
      .replaceAll(";", "\\;")
      .replaceAll(",", "\\,")
      .replaceAll("\n", "\\n");
  const description = escapeIcsText(
    `${params.webinarName}\n\nJoin Zoom: ${params.joinUrl}\n\nYour Zoom link is included in this calendar event.`,
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "PRODID:-//Vektiss//AI Income Training//EN",
    "BEGIN:VEVENT",
    `UID:${params.registrationId}@vektiss.com`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;TZID=America/Chicago:${date}T190000`,
    `DTEND;TZID=America/Chicago:${date}T200000`,
    `SUMMARY:${escapeIcsText(params.webinarName)}`,
    "LOCATION:Zoom",
    `DESCRIPTION:${description}`,
    `URL:${params.joinUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(params.webinarName)} starts in 10 minutes.`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

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

async function unsubscribeUrlFor(supabase: any, baseUrl: string, email: string) {
  const { data: token, error } = await supabase.rpc("get_webinar_email_unsubscribe_token", {
    p_email: email,
  });
  if (error || typeof token !== "string") {
    console.error("Could not create a webinar email unsubscribe link.", error);
    return null;
  }
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
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

function emailBody(params: {
  registrationId: string;
  firstName: string;
  webinarName: string;
  sessionDate: string | null;
  sessionTime: string | null;
  timezone: string | null;
  joinUrl: string;
  unsubscribeUrl: string;
}) {
  const firstName = escapeHtml(params.firstName.trim() || "there");
  const webinarName = escapeHtml(params.webinarName);
  const sessionDate = escapeHtml(sessionDateLabel(params.sessionDate));
  const sessionTime = escapeHtml(params.sessionTime ?? "7:00 PM");
  const timezone = escapeHtml(
    params.timezone === "America/Chicago" ? "Central Time" : (params.timezone ?? "Central Time"),
  );
  const joinUrl = escapeHtml(params.joinUrl);
  const unsubscribeUrl = escapeHtml(params.unsubscribeUrl);
  const calendar = calendarLinks({
    sessionDate: params.sessionDate,
    webinarName: params.webinarName,
    joinUrl: params.joinUrl,
  });
  const invitation = calendarInvitation({
    registrationId: params.registrationId,
    sessionDate: params.sessionDate,
    webinarName: params.webinarName,
    joinUrl: params.joinUrl,
  });
  const calendarSection = calendar
    ? `<div style="margin:0 0 24px;padding:18px 20px;border:1px solid #cde2f7;border-radius:12px;background:#f8fbff">
                <p style="margin:0 0 7px;color:#182033;font-size:16px;font-weight:700">Add this event to your calendar now.</p>
                <p style="margin:0 0 14px;color:#5d6472;font-size:14px;line-height:1.6">Use a calendar button below, or open the attached invitation and choose <strong>Accept</strong> or <strong>Add to calendar</strong>. The Zoom link is included in the event.</p>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:8px;background:#1674c4"><a href="${escapeHtml(calendar.google)}" style="display:inline-block;padding:11px 14px;color:#ffffff;font-size:14px;font-weight:700;line-height:1;text-decoration:none">Add to Google Calendar</a></td><td width="10">&nbsp;</td><td style="border-radius:8px;background:#eef4fb"><a href="${escapeHtml(calendar.outlook)}" style="display:inline-block;padding:11px 14px;color:#0f5f9e;font-size:14px;font-weight:700;line-height:1;text-decoration:none">Add to Outlook</a></td></tr></table>
              </div>`
    : "";
  const mailingAddress = escapeHtml(Deno.env.get("BUSINESS_MAILING_ADDRESS")?.trim() ?? "");
  const privacyUrl = safeHttpsUrl(Deno.env.get("PRIVACY_POLICY_URL"));
  const footerLines = [
    "You received this email because you registered for the AI Income Training.",
    mailingAddress,
    privacyUrl
      ? `<a href="${escapeHtml(privacyUrl)}" style="color:#6b7280">Privacy policy</a>`
      : "",
    `<a href="${unsubscribeUrl}" style="color:#6b7280">Unsubscribe</a>`,
  ].filter(Boolean);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f6f8;color:#182033;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden">
          <tr><td style="background:#0f1f3d;padding:28px 32px"><p style="margin:0;color:#9fd4ff;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${webinarName}</p></td></tr>
          <tr><td style="padding:36px 32px">
            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#182033">${firstName}, you’re registered.</h1>
            <p style="margin:0 0 24px;color:#5d6472;font-size:16px;line-height:1.6">Your seat is confirmed for <strong style="color:#182033">${webinarName}</strong>.</p>
            <p style="margin:0 0 18px;color:#343b4a;font-size:16px;line-height:1.7">This is the email address we’ll use for your Zoom link, reminders, and important training updates.</p>
            <p style="margin:0 0 24px;color:#343b4a;font-size:16px;line-height:1.7">To make sure we land in your inbox, hit reply and send: <strong>I’M IN</strong>.</p>
            <div style="margin:0 0 24px;padding:20px;border:1px solid #cde2f7;border-radius:12px;background:#f3f9ff">
              <p style="margin:0;color:#0f5f9e;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Your webinar</p>
              <p style="margin:8px 0 0;color:#182033;font-size:22px;font-weight:700">${webinarName}</p>
              <p style="margin:16px 0 0;color:#343b4a;font-size:15px;line-height:1.6"><strong>${sessionDate}</strong><br>${sessionTime} ${timezone}<br>Live on Zoom · reserve 7:00–8:00 PM</p>
            </div>
            ${calendarSection}
            <p style="margin:0 0 24px;color:#343b4a;font-size:16px;line-height:1.7">Come ready to think differently about what you already know, what AI makes possible, and how you can begin creating another source of income.</p>
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#1674c4"><a href="${joinUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:16px;font-weight:700;line-height:1;text-decoration:none">Join the live Zoom training</a></td></tr></table>
            <p style="margin:24px 0 0;color:#5d6472;font-size:13px;line-height:1.6">Save this email so your Zoom link is ready when the training begins.</p>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f4f6f8"><div style="color:#6b7280;font-size:12px;line-height:1.6">${footerLines.map((line) => `<div>${line}</div>`).join("")}</div></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hi ${params.firstName.trim() || "there"},`,
    "",
    `You’re registered for ${params.webinarName}.`,
    "",
    "This is the email address we’ll use for your Zoom link, reminders, and important training updates.",
    "",
    "To make sure we land in your inbox, hit reply and send: I’M IN.",
    "",
    params.webinarName,
    `${sessionDateLabel(params.sessionDate)} at ${params.sessionTime ?? "7:00 PM"} ${params.timezone === "America/Chicago" ? "Central Time" : (params.timezone ?? "Central Time")}`,
    "Live on Zoom",
    "",
    "Add this event to your calendar now. Open the attached calendar invitation and choose Accept or Add to calendar; the Zoom link is included in the event.",
    ...(calendar
      ? [`Google Calendar: ${calendar.google}`, `Outlook Calendar: ${calendar.outlook}`, ""]
      : []),
    "Come ready to think differently about what you already know, what AI makes possible, and how you can begin creating another source of income.",
    "",
    `Join the live Zoom training: ${params.joinUrl}`,
    "",
    "Save this email so your Zoom link is ready when the training begins.",
    "",
    "You received this email because you registered for the AI Income Training.",
    ...(mailingAddress ? [mailingAddress] : []),
    ...(privacyUrl ? [`Privacy policy: ${privacyUrl}`] : []),
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");

  return { html, text, sessionDate: sessionDateLabel(params.sessionDate), invitation };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return json(origin, { ok: false, error: "Method not allowed." }, 405);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const webinarJoinUrl = safeHttpsUrl(Deno.env.get("WEBINAR_JOIN_URL"));
  const unsubscribeBaseUrl = safeHttpsUrl(Deno.env.get("UNSUBSCRIBE_URL"));
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !resendApiKey ||
    !resendFromEmail ||
    !webinarJoinUrl ||
    !unsubscribeBaseUrl ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error("Webinar email function is missing required configuration.");
    return json(origin, { ok: false, error: "Webinar email delivery is not configured." }, 500);
  }

  try {
    const payload = (await request.json()) as WebinarEmailRequest;
    if (!isUuid(payload.registrationId)) {
      return json(origin, { ok: false, error: "Invalid registration reference." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: registration, error: registrationError } = await supabase
      .from("webinar_registrations")
      .select("id, first_name, email, webinar_name, session_date, session_time, timezone")
      .eq("id", payload.registrationId)
      .maybeSingle<WebinarRegistration>();

    if (registrationError) {
      console.error("Could not load webinar registration for email delivery.", registrationError);
      return json(origin, { ok: false, error: "Registration lookup failed." }, 500);
    }

    if (!registration || !registration.email) {
      return json(origin, { ok: false, error: "Registration was not found." }, 404);
    }

    const { data: claimStatus, error: claimError } = await supabase.rpc(
      "claim_webinar_registration_email",
      { p_registration_id: registration.id },
    );

    if (claimError || !claimStatus) {
      console.error("Could not claim webinar email delivery.", claimError);
      return json(
        origin,
        { ok: false, error: "Webinar email delivery could not be started." },
        500,
      );
    }

    if (claimStatus === "sent") {
      return json(origin, { ok: true, status: "already_sent" });
    }

    if (claimStatus === "processing") {
      return json(origin, { ok: true, status: "already_processing" }, 202);
    }

    const unsubscribeUrl = await unsubscribeUrlFor(
      supabase,
      unsubscribeBaseUrl,
      registration.email.trim().toLowerCase(),
    );
    if (!unsubscribeUrl) {
      await supabase
        .from("webinar_email_deliveries")
        .update({
          status: "failed",
          failure_reason: "Could not create unsubscribe link",
          updated_at: new Date().toISOString(),
        })
        .eq("registration_id", registration.id);
      return json(origin, { ok: false, error: "Email preference setup failed." }, 500);
    }

    const message = emailBody({
      registrationId: registration.id,
      firstName: registration.first_name ?? "",
      webinarName: registration.webinar_name ?? "Build Your First AI Income Stream",
      sessionDate: registration.session_date,
      sessionTime: registration.session_time,
      timezone: registration.timezone,
      joinUrl: webinarJoinUrl,
      unsubscribeUrl,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `webinar-registration-${registration.id}`,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [registration.email.trim().toLowerCase()],
        subject: `You’re registered: ${registration.webinar_name ?? "Build Your First AI Income Stream"} — ${message.sessionDate}`,
        html: message.html,
        text: message.text,
        ...(message.invitation
          ? {
              attachments: [
                {
                  filename: "Build-Your-First-AI-Income-Stream.ics",
                  content: btoa(message.invitation),
                },
              ],
            }
          : {}),
        tags: [
          { name: "funnel", value: "ai_income_webinar" },
          { name: "registration_id", value: registration.id },
        ],
      }),
    });

    const resendPayload = (await resendResponse.json().catch(() => null)) as {
      id?: unknown;
    } | null;

    if (!resendResponse.ok || typeof resendPayload?.id !== "string") {
      console.error("Resend rejected the webinar registration email.", {
        status: resendResponse.status,
      });
      await supabase
        .from("webinar_email_deliveries")
        .update({
          status: "failed",
          failure_reason: `Resend returned HTTP ${resendResponse.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("registration_id", registration.id);
      return json(origin, { ok: false, error: "Webinar email delivery failed." }, 502);
    }

    const { error: deliveryUpdateError } = await supabase
      .from("webinar_email_deliveries")
      .update({
        status: "sent",
        resend_email_id: resendPayload.id,
        failure_reason: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("registration_id", registration.id);

    if (deliveryUpdateError) {
      console.error(
        "Resend accepted the webinar email but delivery tracking could not be updated.",
        deliveryUpdateError,
      );
    }

    return json(origin, { ok: true, status: "sent" });
  } catch (error) {
    console.error("Unexpected webinar email error.", error);
    return json(origin, { ok: false, error: "Unexpected webinar email error." }, 500);
  }
});
