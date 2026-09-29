import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { webinar } from "@/content/webinar";
import { captureAttribution } from "@/lib/attribution";
import {
  captureFunnelIds,
  registerForWebinar,
  upcomingSession,
  type RegistrationInput,
} from "@/lib/webinar-api";
import { SiteHeader } from "@/components/funnel/SiteHeader";
import {
  Beliefs,
  Faq,
  FinalCta,
  ForYou,
  Framework,
  Hero,
  Learn,
  Opportunity,
  PathFinderBridge,
  RegisterBlock,
  Stages,
  StartOver,
} from "@/components/webinar/Sections";

const TITLE = "Build Your First AI Income Stream — Free Live Training This Sunday";
const DESCRIPTION =
  "Free live training this Sunday at 7 PM Central. Learn how to use the skills you already have to create additional income with AI — no coding, no quitting your job.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://income.vektiss.com/og-cover.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: "https://income.vektiss.com/og-cover.jpg" },
    ],
  }),
  component: WebinarPage,
});

function WebinarPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => upcomingSession());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureAttribution();
    captureFunnelIds();
    const refreshSession = () => {
      setSession((current) => {
        const next = upcomingSession();
        return current.iso === next.iso ? current : next;
      });
    };
    refreshSession();
    const interval = window.setInterval(refreshSession, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const toRegister = () => {
    const el = document.getElementById("register");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => el?.querySelector("input")?.focus({ preventScroll: true }), 600);
  };

  const submit = async (v: RegistrationInput) => {
    setSubmitting(true);
    setError(null);
    const res = await registerForWebinar(v);
    setSubmitting(false);
    if (!res.ok) {
      setError("We couldn’t save your seat just now. Please try again in a moment.");
      console.error(res.error);
      return;
    }
    navigate({ to: "/registered" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader
        label="AI Income Training"
        action={
          <button
            onClick={toRegister}
            className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground sm:text-sm"
          >
            Save My Seat
          </button>
        }
      />
      <Hero onCta={toRegister} sessionLabel={session.label} startsAt={session.startsAt} />
      <Opportunity />
      <Learn />
      <StartOver />
      <Framework />
      <ForYou />
      <Stages />
      <PathFinderBridge onCta={toRegister} sessionLabel={session.label} />
      <RegisterBlock
        onSubmit={submit}
        submitting={submitting}
        error={error}
        sessionLabel={session.label}
      />
      <Beliefs />
      <Faq sessionLabel={session.label} />
      <FinalCta onCta={toRegister} sessionLabel={session.label} />
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {webinar.name}
      </footer>
    </div>
  );
}
