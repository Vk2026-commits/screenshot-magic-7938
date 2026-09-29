import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, MailX } from "lucide-react";

import { SiteHeader } from "@/components/funnel/SiteHeader";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const TITLE = "Email Preferences — AI Income Training";
const DESCRIPTION = "Manage your AI Income Training email preferences.";
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Search = { token?: string };

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { token } = Route.useSearch();
  const validToken = Boolean(token && uuidRe.test(token));
  const [status, setStatus] = useState<"ready" | "working" | "done" | "invalid" | "error">(
    validToken ? "ready" : "invalid",
  );

  const unsubscribe = async () => {
    if (!validToken || !token || !supabaseConfigured) {
      setStatus("invalid");
      return;
    }

    setStatus("working");
    const { data, error } = await supabase.rpc("unsubscribe_webinar_email", {
      p_token: token,
    });
    if (error) {
      console.error("Could not process webinar email unsubscribe request.", error);
      setStatus("error");
      return;
    }
    setStatus(data === true ? "done" : "invalid");
  };

  const content =
    status === "done"
      ? {
          title: "You’re unsubscribed.",
          copy: "You will no longer receive promotional emails or webinar reminders from this sequence.",
          icon: Check,
        }
      : status === "invalid"
        ? {
            title: "This unsubscribe link is not available.",
            copy: "The link may be incomplete or expired. You can safely close this page, or contact us if you still need help with your email preferences.",
            icon: MailX,
          }
        : {
            title: "Stop webinar reminder emails?",
            copy: "This will stop future promotional emails and AI Income Training reminders sent to the address linked to this email.",
            icon: MailX,
          };
  const Icon = content.icon;

  return (
    <div className="min-h-screen">
      <SiteHeader label="AI Income Training" />
      <main className="relative overflow-hidden">
        <div className="grid-canvas pointer-events-none absolute inset-0" />
        <section className="relative mx-auto max-w-xl px-5 py-20 sm:py-28">
          <div className="panel rounded-3xl p-7 text-center sm:p-10">
            <div className="glow-ring mx-auto flex size-16 items-center justify-center rounded-full bg-primary">
              <Icon className="size-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <h1 className="mt-7 text-3xl font-bold leading-tight sm:text-5xl">{content.title}</h1>
            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              {content.copy}
            </p>

            {status === "ready" && (
              <button
                type="button"
                onClick={unsubscribe}
                className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-70"
              >
                Unsubscribe from emails
              </button>
            )}
            {status === "working" && (
              <p className="mt-8 text-sm text-muted-foreground">Updating your preference…</p>
            )}
            {status === "error" && (
              <p className="mt-8 text-sm text-destructive">
                We couldn’t update your preference right now. Please try again in a moment.
              </p>
            )}
            <Link
              to="/"
              className="mt-8 block text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to AI Income Training
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
