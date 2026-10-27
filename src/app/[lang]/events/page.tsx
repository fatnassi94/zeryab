import type { Metadata } from "next";
import { EventRow } from "@/components/event-row";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { getUpcomingEvents } from "@/lib/data/events";
import { getTranslations, localize } from "@/lib/data/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/events">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").events.upcoming };
}

export default async function EventsPage({ params }: PageProps<"/[lang]/events">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const raw = await getUpcomingEvents({ limit: 50, publicOnly: true });
  const events = localize(raw, await getTranslations("events", raw.map((e) => e.id), locale));

  return (
    <PageShell locale={locale} active="events">
      <h1 className="mb-8 font-display text-4xl font-semibold sm:text-5xl">{dict.events.upcoming}</h1>
      {events.length === 0 ? (
        <EmptyState title={dict.events.none} action={{ href: `/${locale}/academy`, label: dict.hero.ctaAcademy }} />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {events.map((ev) => <EventRow key={ev.id} event={ev} locale={locale} as="li" />)}
        </ul>
      )}
    </PageShell>
  );
}
