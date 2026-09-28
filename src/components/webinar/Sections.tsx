import { useState } from "react";
import { ArrowRight, Calendar, Check, Clock, Globe, Loader2, Lock, X } from "lucide-react";
import { webinar } from "@/content/webinar";
import type { RegistrationInput } from "@/lib/webinar-api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.22em] text-primary";
const h2 = "text-[28px] font-bold leading-[1.1] sm:text-5xl";
const glow = { boxShadow: "0 16px 40px -18px color-mix(in oklab, var(--primary) 90%, transparent)" };

export function Cta({ label = webinar.cta, onClick, className = "" }: { label?: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={glow}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 sm:w-auto ${className}`}
    >
      {label}
      <ArrowRight className="size-4" />
    </button>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-5xl px-5 py-16 sm:py-24 ${className}`}>{children}</section>;
}

export function ScheduleChips() {
  const items = [
    { icon: Calendar, t: webinar.schedule.day },
    { icon: Clock, t: webinar.schedule.time },
    { icon: Globe, t: webinar.schedule.place },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ icon: I, t }) => (
        <span key={t} className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium sm:text-sm">
          <I className="size-3.5 text-primary" />
          {t}
        </span>
      ))}
    </div>
  );
}

export function Hero({ onCta, sessionLabel }: { onCta: () => void; sessionLabel: string }) {
  const h = webinar.hero;
  return (
    <section className="relative overflow-hidden">
      <div className="grid-canvas pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-25 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--primary) 60%, transparent)" }}
      />
      <div className="relative mx-auto max-w-3xl px-5 py-14 sm:py-28 animate-rise">
        <p className={eyebrow}>{h.eyebrow}</p>
        <h1 className="mt-4 text-[40px] font-bold leading-[1.04] sm:text-7xl">{h.headline}</h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground sm:text-xl">{h.sub}</p>
        <Cta onClick={onCta} className="mt-9" />
        <p className="mt-3 text-sm font-medium">{h.under}</p>
        {sessionLabel && <p className="mt-1 text-xs text-muted-foreground">Next session: {sessionLabel}</p>}
        <p className="mt-10 max-w-xl border-l-2 border-primary/60 pl-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {h.support}
        </p>
      </div>
    </section>
  );
}

export function Opportunity() {
  const o = webinar.opportunity;
  return (
    <Section className="max-w-3xl">
      <h2 className={h2}>{o.headline}</h2>
      <p className="mt-6 text-[16px] leading-relaxed text-muted-foreground sm:text-lg">{o.lead}</p>
      <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground sm:text-lg">{o.body}</p>
      <p className="mt-6 font-display text-2xl font-semibold text-primary sm:text-3xl">{o.question}</p>
      <div className="mt-8 space-y-4">
        {o.points.map((p) => (
          <p key={p} className="panel rounded-2xl p-5 text-[15px] leading-relaxed sm:text-base">{p}</p>
        ))}
      </div>
      <p className="mt-8 text-[17px] font-semibold sm:text-xl">{o.close}</p>
    </Section>
  );
}

export function Learn() {
  const l = webinar.learn;
  return (
    <Section>
      <h2 className={h2}>{l.headline}</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {l.cards.map((c, i) => (
          <div key={c.title} className="panel rounded-2xl p-6 sm:p-8">
            <span className="font-display text-sm font-semibold text-primary">0{i + 1}</span>
            <h3 className="mt-3 text-xl font-semibold sm:text-2xl">{c.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function StartOver() {
  const s = webinar.startOver;
  return (
    <section className="border-y border-border/60 bg-navy-deep">
      <Section className="max-w-3xl">
        <p className={eyebrow}>{s.eyebrow}</p>
        <h2 className={`${h2} mt-4`}>{s.headline}</h2>
        <p className="mt-6 text-[16px] leading-relaxed text-muted-foreground sm:text-lg">{s.body}</p>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{s.intro}</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {s.skills.map((k) => (
            <span key={k} className="rounded-full border border-border bg-card px-4 py-2.5 text-[15px] font-medium">
              {k}.
            </span>
          ))}
        </div>
        <p className="mt-10 font-display text-xl font-semibold leading-snug sm:text-2xl">{s.close}</p>
        <p className="mt-3 text-muted-foreground">{s.close2}</p>
      </Section>
    </section>
  );
}

export function Framework() {
  const f = webinar.framework;
  return (
    <Section>
      <h2 className={`${h2} text-center`}>{f.headline}</h2>
      <div className="mt-12 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
        {f.steps.map((s, i) => {
          const last = i === f.steps.length - 1;
          return (
            <div key={s.label} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <div
                className={`w-full rounded-2xl border px-6 py-4 text-center font-display text-xl font-bold uppercase tracking-wider sm:w-auto sm:text-2xl ${
                  last ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                }`}
                style={last ? glow : undefined}
              >
                {s.label}
              </div>
              {!last && <ArrowRight className="size-5 rotate-90 text-primary sm:rotate-0" />}
            </div>
          );
        })}
      </div>
      <ol className="mx-auto mt-12 max-w-2xl space-y-3">
        {f.steps.map((s, i) => (
          <li key={s.label} className="flex gap-4 rounded-xl border border-border/60 bg-card/50 p-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
            <span className="text-[15px] leading-relaxed sm:text-base">{s.text}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function ForYou() {
  const f = webinar.forYou;
  return (
    <Section className="max-w-3xl">
      <h2 className={h2}>{f.headline}</h2>
      <ul className="mt-8 space-y-3">
        {f.items.map((t) => (
          <li key={t} className="panel flex gap-3 rounded-xl p-4 sm:p-5">
            <Check className="mt-0.5 size-5 shrink-0 text-primary" />
            <span className="text-[15px] leading-relaxed sm:text-base">{t}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Stages() {
  const s = webinar.stages;
  return (
    <Section>
      <h2 className={h2}>{s.headline}</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {s.items.map((st, i) => (
          <div key={st.title} className="panel relative overflow-hidden rounded-2xl p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" style={{ opacity: 0.35 + i * 0.3 }} />
            <p className={eyebrow}>{st.tag}</p>
            <h3 className="mt-3 text-xl font-bold uppercase tracking-wide">{st.title}</h3>
            {st.lines.map((l, j) => (
              <p key={l} className={`mt-3 text-[15px] leading-relaxed ${j === 0 ? "" : "text-muted-foreground"}`}>{l}</p>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <p className="text-lg font-semibold sm:text-xl">{s.close[0]}</p>
        <p className="mt-1 text-muted-foreground">{s.close[1]}</p>
      </div>
    </Section>
  );
}

export function PathFinderBridge({ onCta }: { onCta: () => void }) {
  const p = webinar.pathFinder;
  return (
    <Section className="max-w-3xl">
      <div className="panel glow-ring rounded-3xl p-6 sm:p-10">
        <h2 className="text-2xl font-bold leading-tight sm:text-4xl">{p.headline}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">{p.body}</p>
        <p className="mt-4 font-semibold">{p.deeper}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[p.q1, p.q2].map((q, i) => (
            <div key={q.quote} className={`rounded-xl border p-4 ${i ? "border-primary/50 bg-primary/10" : "border-border bg-navy-deep"}`}>
              <p className="text-xs text-muted-foreground">{q.label}</p>
              <p className="mt-2 font-display text-lg font-semibold">“{q.quote}”</p>
            </div>
          ))}
        </div>
        <Cta label={p.cta} onClick={onCta} className="mt-8" />
      </div>
    </Section>
  );
}

const field =
  "h-13 w-full rounded-xl border border-border bg-navy-deep px-4 text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary";
const emailRe = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const phoneRe = /^[+]?[\d\s().-]{7,20}$/;

export function RegisterBlock({
  onSubmit,
  submitting,
  error,
  sessionLabel,
}: {
  onSubmit: (v: RegistrationInput) => void;
  submitting: boolean;
  error: string | null;
  sessionLabel: string;
}) {
  const r = webinar.register;
  const [v, setV] = useState<RegistrationInput>({ first_name: "", email: "", phone: "" });
  const [errs, setErrs] = useState<Partial<Record<keyof RegistrationInput, string>>>({});
  const validate = () => {
    const e: typeof errs = {};
    if (v.first_name.trim().length < 2) e.first_name = "Please enter your first name.";
    if (!emailRe.test(v.email.trim())) e.email = "Please enter a valid email address.";
    if (!phoneRe.test(v.phone.trim())) e.phone = "Please enter a valid mobile number.";
    setErrs(e);
    return !Object.keys(e).length;
  };
  const fields = [
    { k: "first_name", label: "First Name", type: "text", ph: "Your first name", ac: "given-name" },
    { k: "email", label: "Email Address", type: "email", ph: "you@example.com", ac: "email" },
    { k: "phone", label: "Mobile Phone Number", type: "tel", ph: "(555) 123-4567", ac: "tel" },
  ] as const;
  return (
    <section id="register" className="relative scroll-mt-14 overflow-hidden border-y border-primary/30 bg-navy-deep">
      <div
        className="pointer-events-none absolute -right-40 top-0 size-[480px] rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--primary)" }}
      />
      <div className="relative mx-auto grid max-w-5xl gap-10 px-5 py-16 sm:py-24 md:grid-cols-2 md:items-center">
        <div>
          <p className={eyebrow}>{r.eyebrow}</p>
          <h2 className={`${h2} mt-4`}>{r.headline}</h2>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {r.facts.map((f) => (
              <div key={f} className="rounded-xl border border-border bg-card px-4 py-4 text-center font-display text-sm font-bold uppercase tracking-wider sm:text-base">
                {f}
              </div>
            ))}
          </div>
          <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground sm:text-base">{r.copy}</p>
          {sessionLabel && <p className="mt-2 text-sm font-medium text-primary">Upcoming session: {sessionLabel}</p>}
        </div>
        <form
          className="panel space-y-4 rounded-2xl p-6 sm:p-8"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) onSubmit(v);
          }}
        >
          {fields.map((f) => (
            <label key={f.k} className="block">
              <span className="mb-1.5 block text-sm font-medium">{f.label}</span>
              <input
                className={field}
                type={f.type}
                placeholder={f.ph}
                autoComplete={f.ac}
                value={v[f.k]}
                onChange={(e) => setV((s) => ({ ...s, [f.k]: e.target.value }))}
              />
              {errs[f.k] && <span className="mt-1 block text-xs text-destructive">{errs[f.k]}</span>}
            </label>
          ))}
          <button
            type="submit"
            disabled={submitting}
            style={glow}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-70"
          >
            {submitting ? <Loader2 className="size-5 animate-spin" /> : null}
            {webinar.cta}
            {!submitting && <ArrowRight className="size-4" />}
          </button>
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> {r.privacy}
          </p>
        </form>
      </div>
    </section>
  );
}

export function Beliefs() {
  const b = webinar.beliefs;
  return (
    <Section className="max-w-3xl">
      <h2 className={h2}>{b.headline}</h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {b.items.map((t) => (
          <div key={t} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <X className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <span className="text-[15px] leading-relaxed">{t}</span>
          </div>
        ))}
      </div>
      <p className="mt-8 font-display text-xl font-semibold text-primary sm:text-2xl">{b.close}</p>
    </Section>
  );
}

export function Faq() {
  return (
    <Section className="max-w-3xl">
      <h2 className={h2}>Questions</h2>
      <Accordion type="single" collapsible className="mt-8">
        {webinar.faq.map((f, i) => (
          <AccordionItem key={f.q} value={`q${i}`} className="border-border">
            <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}

export function FinalCta({ onCta }: { onCta: () => void }) {
  const f = webinar.final;
  return (
    <section className="relative overflow-hidden">
      <div className="grid-canvas pointer-events-none absolute inset-0 rotate-180" />
      <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
        <h2 className={h2}>
          {f.headline[0]}
          <br />
          <span className="text-primary">{f.headline[1]}</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-lg">{f.copy}</p>
        <p className="mt-8 font-display text-lg font-bold uppercase tracking-[0.18em]">
          {f.display[0]} <span className="text-primary">•</span> {f.display[1]}
        </p>
        <div className="mt-8 flex justify-center">
          <Cta onClick={onCta} />
        </div>
      </div>
    </section>
  );
}
