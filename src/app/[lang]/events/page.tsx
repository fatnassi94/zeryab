import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { formatDate, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { getTranslations, getUpcomingEvents, localize } from "@/lib/data/events";
import { MetaLine } from "@/components/meta-line";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata({ params }: PageProps<"/[lang]/events">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").events.upcoming };
}

export default async function EventsPage({ params }: PageProps<"/[lang]/events">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const raw = await getUpcomingEvents({ limit: 50 });
  const events = localize(raw, await getTranslations("events", raw.map((e) => e.id), locale));

  return (
    <PageShell locale={locale} active="events">
      <h1 className="mb-8 font-display text-4xl font-semibold sm:text-5xl">{dict.events.upcoming}</h1>
      {events.length === 0 ? (
        <EmptyState title={dict.events.none} action={{ href: `/${locale}/academy`, label: dict.hero.ctaAcademy }} />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-line px-2 py-7">
              <span className="min-w-[150px] font-display text-[26px] font-semibold text-gold">{formatDate(locale, ev.starts_at)}</span>
              <div className="flex flex-[1_1_min(320px,100%)] flex-col gap-1.5">
                <span className="text-[22px] font-medium">{ev.title}</span>
                <span className="text-sm text-muted"><MetaLine parts={[ev.venue, formatTime(locale, ev.starts_at)]} /></span>
              </div>
              <span className="chip chip-teal">{dict.events.kinds[ev.kind]}</span>
              <Link href={`/${locale}/events/${ev.id}`} className="inline-flex min-h-12 items-center rounded-full bg-text px-6 font-semibold text-ink no-underline hover:bg-gold-light hover:text-ink">
                {ev.is_bookable ? dict.events.book : dict.events.details}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
