import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Check, Clock, Globe } from "lucide-react";

import { webinar } from "@/content/webinar";
import { REGISTRATION_KEY } from "@/lib/webinar-api";
import { SiteHeader } from "@/components/funnel/SiteHeader";

const TITLE = "You’re Registered — Build Your First AI Income Stream";
const DESCRIPTION = "Your seat is reserved for Sunday’s live training at 7:00 PM Central.";

export const Route = createFileRoute("/registered")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Registered,
});

interface Saved {
  firstName: string;
  sessionLabel: string;
  planUrl: string | null;
}

function Registered() {
  const [saved, setSaved] = useState<Saved | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REGISTRATION_KEY);
      if (raw) setSaved(JSON.parse(raw) as Saved);
    } catch {
      /* ignore */
    }
  }, []);
  const c = webinar.confirm;

  return (
    <div className="min-h-screen">
      <SiteHeader label="AI Income Training" />
      <section className="relative overflow-hidden">
        <div className="grid-canvas pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-25 blur-3xl"
          style={{ background: "color-mix(in oklab, var(--primary) 60%, transparent)" }}
        />
        <div className="relative mx-auto max-w-2xl px-5 py-16 text-center animate-rise sm:py-24">
          <div className="glow-ring mx-auto flex size-16 items-center justify-center rounded-full bg-primary">
            <Check className="size-8 text-primary-foreground" strokeWidth={3} />
          </div>
          <h1 className="mt-8 text-[40px] font-bold leading-tight sm:text-6xl">{c.headline}</h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            {saved?.firstName ? `${saved.firstName}, w` : "W"}
            {c.sub.slice(1)}
          </p>

          <div className="panel mt-10 rounded-2xl p-6 text-left sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Your seat
            </p>
            <h2 className="mt-2 text-2xl font-bold">{webinar.name}</h2>
            <div className="mt-5 space-y-3">
              {[
                { I: Calendar, t: saved?.sessionLabel ?? webinar.schedule.day },
                { I: Clock, t: "7:00 PM Central" },
                { I: Globe, t: "Live Online" },
              ].map(({ I, t }) => (
                <p key={t} className="flex items-center gap-3 text-base font-medium">
                  <I className="size-5 text-primary" /> {t}
                </p>
              ))}
            </div>
          </div>

          <p className="mt-8 text-[15px] leading-relaxed sm:text-base">{c.copy1}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            {c.copy2}
          </p>

          {saved?.planUrl && (
            <a
              href={saved.planUrl}
              className="mx-auto mt-10 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 font-semibold text-primary-foreground hover:brightness-110 sm:w-auto sm:inline-flex"
            >
              {c.planCta} <ArrowRight className="size-4" />
            </a>
          )}
          <Link
            to="/"
            className="mt-8 block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to training page
          </Link>
        </div>
      </section>
    </div>
  );
}
