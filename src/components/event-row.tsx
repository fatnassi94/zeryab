import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { formatDate, formatTime, getDictionary } from "@/i18n/server";
import type { EventRow as EventData } from "@/lib/data/events";
import { contentLang, type Localized } from "@/lib/data/i18n";
import { MetaLine } from "./meta-line";

/**
 * One line of a concert programme: date | title + place/time | kind + action.
 * Phones stack date, title and actions; from `md` it's a three-column grid so
 * the action never wraps under the date.
 */
export function EventRow({ event, locale, as: Tag = "div" }: { event: Localized<EventData>; locale: Locale; as?: "div" | "li" }) {
  const dict = getDictionary(locale);
  return (
    <Tag className="grid items-center gap-x-10 gap-y-3 border-t border-line px-2 py-6 md:grid-cols-[150px_1fr_auto] md:py-7">
      <span className="font-display text-[22px] font-semibold text-gold md:text-[26px]">{formatDate(locale, event.starts_at)}</span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xl font-medium md:text-[22px]" {...contentLang(event, "title", locale)}>{event.title}</span>
        <span className="text-sm text-muted"><MetaLine parts={[event.venue, formatTime(locale, event.starts_at)]} /></span>
      </div>
      <div className="flex items-center gap-3 md:justify-end">
        <span className="chip chip-teal">{dict.events.kinds[event.kind]}</span>
        <Link
          href={`/${locale}/events/${event.id}`}
          className="inline-flex min-h-12 items-center rounded-full bg-text px-6 font-semibold whitespace-nowrap text-ink no-underline transition-colors hover:bg-gold-light hover:text-ink"
        >
          {event.is_bookable ? dict.events.book : dict.events.details}
        </Link>
      </div>
    </Tag>
  );
}
