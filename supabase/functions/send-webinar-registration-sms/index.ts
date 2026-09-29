import { createClient } from "npm:@supabase/supabase-js@2";

type WebinarSmsRequest = {
  registrationId?: unknown;
};

type WebinarRegistration = {
  id: string;
  first_name: string | null;
  phone: string | null;
  webinar_name: string | null;
  session_date: string | null;
  session_time: string | null;
  timezone: string | null;
  sms_opt_in: boolean | null;
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

function normalizeUsPhone(value: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
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

function friendlyTime(registration: WebinarRegistration) {
  const time = registration.session_time ?? "7:00 PM";
  const timezone =
    registration.timezone === "America/Chicago"
      ? "Central Time"
      : (registration.timezone ?? "Central Time");
  return `${time} ${timezone}`;
}

function confirmationText(registration: WebinarRegistration, joinUrl: string) {
  const firstName = registration.first_name?.trim() || "there";
  return `Hi ${firstName}, you’re registered for Build Your First AI Income Stream on ${sessionDateLabel(registration.session_date)} at ${friendlyTime(registration)}. Join live: ${joinUrl} Reply STOP to opt out, HELP for help.`;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return json(origin, { ok: false, error: "Method not allowed." }, 405);
  }

  const retellApiKey = Deno.env.get("RETELL_API_KEY");
  const retellFromNumber = normalizeUsPhone(Deno.env.get("RETELL_FROM_NUMBER") ?? null);
  const retellAgentId = Deno.env.get("RETELL_SMS_AGENT_ID")?.trim();
  const webinarJoinUrl = safeHttpsUrl(Deno.env.get("WEBINAR_JOIN_URL"));
  const registrationUrl = safeHttpsUrl(Deno.env.get("WEBINAR_REGISTRATION_URL")) ?? defaultOrigin;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey || !webinarJoinUrl) {
    console.error("Webinar SMS function is missing Supabase or webinar configuration.");
    return json(origin, { ok: false, error: "Webinar SMS delivery is not configured." }, 500);
  }

  try {
    const payload = (await request.json()) as WebinarSmsRequest;
    if (!isUuid(payload.registrationId)) {
      return json(origin, { ok: false, error: "Invalid registration reference." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: registration, error: registrationError } = await supabase
      .from("webinar_registrations")
      .select(
        "id, first_name, phone, webinar_name, session_date, session_time, timezone, sms_opt_in",
      )
      .eq("id", payload.registrationId)
      .maybeSingle<WebinarRegistration>();

    if (registrationError) {
      console.error("Could not load webinar registration for SMS delivery.", registrationError);
      return json(origin, { ok: false, error: "Registration lookup failed." }, 500);
    }
    if (!registration) {
      return json(origin, { ok: false, error: "Registration was not found." }, 404);
    }
    if (registration.sms_opt_in !== true) {
      return json(origin, { ok: true, status: "not_opted_in" });
    }

    const recipientPhone = normalizeUsPhone(registration.phone);
    if (!recipientPhone) {
      return json(origin, { ok: true, status: "invalid_phone" });
    }
    if (!retellApiKey || !retellFromNumber || !retellAgentId) {
      // This is deliberately a non-delivery state, not a client-visible failure.
      // It lets consent and registration deploy before SMS is enabled at runtime.
      return json(origin, { ok: true, status: "sms_not_enabled" });
    }

    const scheduledFor = new Date().toISOString();
    const { data: claimStatus, error: claimError } = await supabase.rpc(
      "claim_webinar_sms_delivery",
      {
        p_registration_id: registration.id,
        p_message_key: "registration",
        p_scheduled_for: scheduledFor,
      },
    );
    if (claimError || !claimStatus) {
      console.error("Could not claim webinar registration SMS.", claimError);
      return json(origin, { ok: false, error: "Webinar SMS delivery could not be started." }, 500);
    }
    if (claimStatus === "sent") return json(origin, { ok: true, status: "already_sent" });
    if (claimStatus === "processing") {
      return json(origin, { ok: true, status: "already_processing" }, 202);
    }

    const message = confirmationText(registration, webinarJoinUrl);
    const retellResponse = await fetch("https://api.retellai.com/create-sms-chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${retellApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_number: retellFromNumber,
        to_number: recipientPhone,
        override_agent_id: retellAgentId,
        override_agent_version: "latest_published",
        metadata: {
          source: "ai_income_webinar",
          registration_id: registration.id,
          message_key: "registration",
        },
        retell_llm_dynamic_variables: {
          scheduled_message: message,
          recipient_first_name: registration.first_name?.trim() || "there",
          session_date: sessionDateLabel(registration.session_date),
          session_time: friendlyTime(registration),
          join_url: webinarJoinUrl,
          registration_url: registrationUrl,
        },
      }),
    });
    const retellPayload = (await retellResponse.json().catch(() => null)) as {
      chat_id?: unknown;
    } | null;
    if (!retellResponse.ok || typeof retellPayload?.chat_id !== "string") {
      console.error("Retell rejected the webinar registration SMS.", {
        status: retellResponse.status,
      });
      await supabase
        .from("webinar_sms_deliveries")
        .update({
          status: "failed",
          failure_reason: `Retell returned HTTP ${retellResponse.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("registration_id", registration.id)
        .eq("message_key", "registration");
      return json(origin, { ok: false, error: "Webinar SMS delivery failed." }, 502);
    }

    await supabase
      .from("webinar_sms_deliveries")
      .update({
        status: "sent",
        retell_chat_id: retellPayload.chat_id,
        failure_reason: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("registration_id", registration.id)
      .eq("message_key", "registration");

    return json(origin, { ok: true, status: "sent" });
  } catch (error) {
    console.error("Unexpected webinar SMS error.", error);
    return json(origin, { ok: false, error: "Unexpected webinar SMS error." }, 500);
  }
});
