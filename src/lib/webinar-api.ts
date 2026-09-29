/**
 * Webinar registration: session scheduling, funnel identifiers and Supabase write.
 * Writes go through the register_for_webinar RPC (supabase/webinar.sql), which
 * normalizes email, reuses an existing lead, and links the registration.
 */
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { captureAttribution } from "@/lib/attribution";
import { PLAN_URL_HOSTS } from "@/content/webinar";

const TZ = "America/Chicago";

function chicagoParts(date: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
}

/** Converts a non-ambiguous Central Time date/time into a UTC instant, including DST. */
function chicagoDateTime(date: string, hour: number, minute: number) {
  const [year, month, day] = date.split("-").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let timestamp = desiredAsUtc;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const local = chicagoParts(new Date(timestamp));
    const localAsUtc = Date.UTC(
      Number(local["year"]),
      Number(local["month"]) - 1,
      Number(local["day"]),
      Number(local["hour"]),
      Number(local["minute"]),
      Number(local["second"]),
    );
    timestamp += desiredAsUtc - localAsUtc;
  }

  return new Date(timestamp);
}

/** Upcoming Sunday (YYYY-MM-DD, Central). Today counts until 7:00 PM CT. */
export function upcomingSession(now = new Date()) {
  const parts = chicagoParts(now);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = days.indexOf(parts["weekday"]!);
  let add = (7 - dow) % 7;
  if (add === 0 && Number(parts["hour"]) >= 19) add = 7;
  const base = new Date(
    Date.UTC(Number(parts["year"]), Number(parts["month"]) - 1, Number(parts["day"])),
  );
  base.setUTCDate(base.getUTCDate() + add);
  const iso = base.toISOString().slice(0, 10);
  const label = base.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return { iso, label, startsAt: chicagoDateTime(iso, 19, 0).toISOString() };
}

export interface FunnelIds {
  leadId: string | null;
  assessmentId: string | null;
  planUrl: string | null;
}

const IDS_KEY = "aiw_funnel_ids";
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safePlanUrl(raw: string | null) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && PLAN_URL_HOSTS.includes(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Reads lead_id / assessment_id / plan_url from the URL and keeps them for the session. */
export function captureFunnelIds(): FunnelIds {
  const empty: FunnelIds = { leadId: null, assessmentId: null, planUrl: null };
  if (typeof window === "undefined") return empty;
  let stored = empty;
  try {
    stored = { ...empty, ...(JSON.parse(sessionStorage.getItem(IDS_KEY) ?? "{}") as FunnelIds) };
  } catch {
    /* ignore */
  }
  const q = new URLSearchParams(window.location.search);
  const lead = q.get("lead_id");
  const assess = q.get("assessment_id");
  const ids: FunnelIds = {
    leadId: lead && uuidRe.test(lead) ? lead : stored.leadId,
    assessmentId: assess && uuidRe.test(assess) ? assess : stored.assessmentId,
    planUrl: safePlanUrl(q.get("plan_url")) ?? stored.planUrl,
  };
  try {
    sessionStorage.setItem(IDS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  return ids;
}

export interface RegistrationInput {
  first_name: string;
  email: string;
  phone: string;
  sms_opt_in: boolean;
}

export const REGISTRATION_KEY = "aiw_registration";

export async function registerForWebinar(input: RegistrationInput) {
  if (!supabaseConfigured)
    return { ok: false as const, error: "Registration is not connected yet." };
  const session = upcomingSession();
  const ids = captureFunnelIds();
  const attribution = captureAttribution();
  const { data, error } = await supabase.rpc("register_for_webinar", {
    p: {
      first_name: input.first_name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      sms_opt_in: input.sms_opt_in,
      session_date: session.iso,
      assessment_id: ids.assessmentId,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      referral_url: attribution.referral_url,
      landing_page_url: attribution.landing_page_url,
    },
  });
  if (error || !data)
    return { ok: false as const, error: error?.message ?? "Registration failed." };

  const registrationId = data as string;
  const { error: emailError } = await supabase.functions.invoke("send-webinar-registration-email", {
    body: { registrationId },
  });
  if (emailError) {
    // The registration is still complete if email delivery is temporarily unavailable.
    // The server-side delivery ledger makes a later retry safe and idempotent.
    console.error("Could not start webinar confirmation email delivery.", emailError);
  }

  if (input.sms_opt_in) {
    const { error: smsError } = await supabase.functions.invoke("send-webinar-registration-sms", {
      body: { registrationId },
    });
    if (smsError) {
      // SMS is strictly opt-in and never blocks a completed registration.
      // Its server-side delivery ledger makes a later retry safe and idempotent.
      console.error("Could not start webinar confirmation SMS delivery.", smsError);
    }
  }

  try {
    sessionStorage.setItem(
      REGISTRATION_KEY,
      JSON.stringify({
        firstName: input.first_name.trim(),
        sessionLabel: session.label,
        planUrl: ids.planUrl,
      }),
    );
  } catch {
    /* ignore */
  }
  return { ok: true as const, id: registrationId };
}
