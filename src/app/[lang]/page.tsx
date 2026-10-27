import Link from "next/link";
import { ForwardArrow, LockIcon } from "@/components/logo";
import { HeroScene } from "@/components/hero-scene";
import { PillarArt } from "@/components/pillar-art";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatDate, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { getUpcomingEvents } from "@/lib/data/events";
import { contentLang, getTranslations, localize } from "@/lib/data/i18n";
import { MetaLine } from "@/components/meta-line";
import { EmptyState } from "@/components/ui/empty-state";
import { EventRow } from "@/components/event-row";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const raw = await getUpcomingEvents({ limit: 3, publicOnly: true });
  const events = localize(raw, await getTranslations("events", raw.map((e) => e.id), locale));
  const next = events[0];

  // Three spaces, three instruments.
  const pillars = [
    { key: "events", ...dict.pillars.events, href: `${base}/events`, instrument: "darbuka" as const },
    { key: "academy", ...dict.pillars.academy, href: `${base}/academy`, instrument: "oud" as const },
    { key: "library", ...dict.pillars.library, href: `${base}/library`, instrument: "nay" as const },
  ];

  const bars = Array.from({ length: 40 }, (_, i) => {
    const h = Math.round(10 + 40 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)));
    return { x: i * 8, y: 30 - h / 2, h, o: i < 16 ? 1 : 0.35 };
  });

  return (
    <>
      <section className="relative flex min-h-[min(100svh,960px)] flex-col overflow-hidden bg-night">
        {/* The ark sits opposite the text column: start side in RTL, end side in LTR. */}
        <div className="absolute inset-0 ltr:-scale-x-100">
          <HeroScene />
        </div>
        {/* Keeps text readable where it crosses the scene, strongest on phones. */}
        <div className="absolute inset-0 bg-gradient-to-l from-ink/85 via-ink/40 to-transparent max-md:from-ink/70 max-md:via-ink/60 ltr:bg-gradient-to-r" />
        <div className="absolute inset-x-0 bottom-0 h-[220px] bg-gradient-to-b from-ink/0 to-ink" />

        <SiteHeader locale={locale} active="home" />

        <div className="relative z-[2] mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-between gap-12 px-4 pt-14 pb-10 sm:px-6 sm:pt-24 sm:pb-14">
          <div className="flex max-w-[600px] flex-col gap-6">
            <div className="enter flex items-center gap-3 text-sm text-gold" style={{ ["--enter-delay" as string]: "300ms" }}>
              <span className="h-px w-10 bg-gold" />
              {dict.hero.eyebrow}
            </div>
            <h1
              className={`m-0 font-display font-bold text-balance ${
                locale === "ar"
                  ? "text-[clamp(42px,7vw,80px)] leading-[1.15]"
                  : "text-[clamp(36px,5.2vw,64px)] leading-[1.08] tracking-[-0.01em]"
              }`}
            >
              <span className="enter block" style={{ ["--enter-delay" as string]: "420ms" }}>{dict.hero.title1}</span>
              <span className="enter block text-gold" style={{ ["--enter-delay" as string]: "540ms" }}>{dict.hero.title2}</span>
            </h1>
            <p className="enter m-0 max-w-[540px] text-[17px] leading-[1.9] font-light text-soft sm:text-[19px]" style={{ ["--enter-delay" as string]: "680ms" }}>{dict.hero.text}</p>
            <div className="enter mt-1 flex flex-wrap gap-3" style={{ ["--enter-delay" as string]: "800ms" }}>
              <Link href={next ? `${base}/events/${next.id}` : `${base}/events`} className="btn-gold min-h-14! px-7! glow-gold">
                {dict.hero.ctaBook} <ForwardArrow />
              </Link>
              <Link href={`${base}/academy`} className="btn-ghost min-h-14! bg-white/6 px-7! backdrop-blur-md">
                {dict.hero.ctaAcademy}
              </Link>
            </div>
          </div>

          {next && (
            <div className="enter glass flex w-full max-w-[460px] items-center gap-4 rounded-3xl p-3 ps-3 pe-4 sm:gap-5 sm:p-4" style={{ ["--enter-delay" as string]: "1000ms" }}>
              <div className="flex size-16 flex-none flex-col items-center justify-center rounded-[18px] bg-gold/12 text-gold sm:size-[72px]">
                <span className="font-display text-[22px] leading-[1.1] font-bold">{formatDate(locale, next.starts_at, { month: undefined })}</span>
                <span className="text-xs">{formatDate(locale, next.starts_at, { day: undefined, month: "short" })}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs text-muted">{dict.hero.nextShow}</span>
                <span className="truncate text-[17px] font-medium" {...contentLang(next, "title", locale)}>{next.title}</span>
                <span className="truncate text-[13px] text-muted">
                  <MetaLine parts={[next.venue, formatTime(locale, next.starts_at)]} />
                </span>
              </div>
              <Link href={`${base}/events/${next.id}`} className="inline-flex min-h-11 flex-none items-center rounded-full border border-gold/50 px-5 font-medium text-gold no-underline hover:border-gold">
                {dict.hero.book}
              </Link>
            </div>
          )}
        </div>
      </section>

      <main>
        <section aria-labelledby="pillars" className="mx-auto max-w-[1280px] px-4 pt-[72px] pb-10 sm:px-6">
          <div className="reveal mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="pillars" className="m-0 font-display text-4xl leading-[1.2] font-semibold sm:text-5xl">{dict.pillars.title}</h2>
            <p className="m-0 max-w-[420px] leading-[1.8] text-muted">{dict.pillars.text}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((p, i) => (
              <Link key={p.key} href={p.href} style={{ ["--reveal-i" as string]: i }}
                className="pillar-card reveal group card relative flex min-h-[400px] flex-col overflow-hidden px-7 pt-6 pb-7 text-text no-underline transition-colors hover:border-gold/40 hover:text-text">
                <div aria-hidden="true" className="pointer-events-none absolute -top-24 start-1/2 size-72 -translate-x-1/2 rounded-full bg-gold/0 blur-3xl transition-colors duration-500 group-hover:bg-gold/10 rtl:translate-x-1/2" />
                <div className="relative mx-auto h-[220px] w-[220px]">
                  <PillarArt instrument={p.instrument} />
                </div>
                <div className="mt-5 flex flex-1 flex-col gap-2.5">
                  <h3 className="m-0 font-display text-[28px] font-semibold">{p.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.8] text-muted">{p.text}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-3 text-sm font-medium text-gold">
                    {dict.pillars.open}
                    <span aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-1 ltr:group-hover:translate-x-1"><ForwardArrow /></span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="events" aria-labelledby="ev-h" className="mx-auto max-w-[1280px] px-4 pt-14 pb-10 sm:px-6">
          <div className="reveal mb-7 flex flex-wrap items-end justify-between gap-4">
            <h2 id="ev-h" className="m-0 font-display text-4xl font-semibold sm:text-5xl">{dict.events.upcoming}</h2>
            <Link href={`${base}/events`} className="font-medium">{dict.events.all}</Link>
          </div>
          {events.length === 0 ? (
            <EmptyState title={dict.events.none} />
          ) : (
            <div className="flex flex-col">
              {events.map((ev, i) => (
                <div key={ev.id} className="reveal" style={{ ["--reveal-i" as string]: i }}>
                  <EventRow event={ev} locale={locale} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="ls-h" className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6">
          <div className="reveal card flex flex-wrap items-center gap-12 rounded-[32px] p-6 sm:p-12">
            <div className="flex flex-[1_1_min(360px,100%)] flex-col gap-4">
              <span className="text-sm text-gold">{dict.library.eyebrow}</span>
              <h2 id="ls-h" className="m-0 font-display text-[34px] leading-[1.25] font-semibold sm:text-[44px]">{dict.library.title}</h2>
              <p className="m-0 leading-[1.9] text-muted">{dict.library.text}</p>
              <svg viewBox="0 0 320 60" width="320" height="60" aria-hidden="true" className="max-w-full">
                <g fill="#E4BE74">
                  {bars.map((b) => <rect key={b.x} x={b.x} y={b.y} width="4" height={b.h} rx="2" opacity={b.o} />)}
                </g>
              </svg>
            </div>
            <div className="relative flex flex-[1_1_min(520px,100%)] flex-col gap-2.5">
              {dict.library.sample.map((title) => (
                <div key={title} aria-hidden="true" className="flex items-center gap-4 rounded-[18px] border border-white/6 bg-white/4 px-[18px] py-3.5 opacity-55 blur-[3px]">
                  <span className="flex size-12 flex-none items-center justify-center rounded-full bg-gold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1A1206" className="ltr:-scale-x-100"><path d="M18 5v14L6 12z" /></svg>
                  </span>
                  <span className="flex-1 font-medium">{title}</span>
                  <span className="text-[13px] text-muted">--:--</span>
                </div>
              ))}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 rounded-[18px] bg-ink/40 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-gold/14 text-gold"><LockIcon size={24} /></div>
                <span className="text-[17px] font-medium">{dict.library.locked}</span>
                <Link href={`${base}/login`} className="btn-gold">{dict.library.login}</Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="join-h" className="mx-auto max-w-[1280px] px-4 pt-6 pb-28 sm:px-6">
          <div className="reveal flex flex-wrap items-center justify-between gap-7 rounded-[32px] panel-invite px-6 py-12 sm:px-12 sm:py-16">
            <div className="flex max-w-[640px] flex-col gap-3">
              <h2 id="join-h" className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{dict.join.title}</h2>
              <p className="m-0 text-[17px] leading-[1.9] text-soft">{dict.join.text}</p>
            </div>
            <Link href={`${base}/join`} className="btn-gold min-h-14! px-7!">{dict.join.cta}</Link>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
