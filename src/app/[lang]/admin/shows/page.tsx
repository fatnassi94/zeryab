import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { hasLocale } from "@/i18n/config";
import { fill, formatDate, formatNumber, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { startedSince } from "@/lib/posts";
import { SHOW_STATUS_CHIP as STATUS_CHIP, type ShowKind, type ShowStatus } from "@/lib/shows";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/shows">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.shows.title };
}

type Row = { id: string; kind: ShowKind; title: string; venue: string | null; starts_at: string; status: ShowStatus; is_bookable: boolean; capacity: number | null };

/** Public shows: upcoming first (drafts included), then the last ones, with seats booked. */
export default async function ShowsAdminPage({ params }: PageProps<"/[lang]/admin/shows">) {
  const locale = await resolveLocale(params);
  await requireRole(locale, ["activity_manager"]);
  const dict = getDictionary(locale);
  const t = dict.admin.shows;
  const n = (v: number) => formatNumber(locale, v);

  const supabase = await createClient();
  const cols = "id, kind, title, venue, starts_at, status, is_bookable, capacity";
  const since = startedSince();
  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase.from("events").select(cols).eq("visibility", "public").gte("starts_at", since).order("starts_at").limit(50),
    supabase.from("events").select(cols).eq("visibility", "public").lt("starts_at", since).order("starts_at", { ascending: false }).limit(20),
  ]);
  const all = [...(upcoming ?? []), ...(past ?? [])] as Row[];
  // Seats asked for per show (confirmed + waiting), cancelled bookings left out.
  const { data: bookings } = all.length
    ? await supabase.from("bookings").select("event_id, seats, status").in("event_id", all.map((s) => s.id)).neq("status", "cancelled")
    : { data: [] };
  const booked = new Map<string, number>();
  for (const b of bookings ?? []) booked.set(b.event_id, (booked.get(b.event_id) ?? 0) + b.seats);

  const card = (s: Row) => {
    const seats = booked.get(s.id) ?? 0;
    return (
      <li key={s.id} className="card flex flex-wrap items-center gap-4 p-5">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={STATUS_CHIP[s.status]}>{t.statuses[s.status]}</span>
            <span className="chip">{dict.events.kinds[s.kind]}</span>
            <span className="text-sm text-muted">
              {formatDate(locale, s.starts_at, { weekday: "long", year: "numeric" })} · {formatTime(locale, s.starts_at)}{s.venue ? ` · ${s.venue}` : ""}
            </span>
          </div>
          <Link href={`/${locale}/admin/shows/${s.id}`} className="font-display text-2xl font-semibold text-text no-underline hover:text-gold-light">{s.title}</Link>
          <span className="text-[13px] text-muted">
            {!s.is_bookable ? t.noBooking : s.capacity ? fill(t.bookedOf, { n: n(seats), capacity: n(s.capacity) }) : fill(t.booked, { n: n(seats) })}
          </span>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/admin/shows/${s.id}`} className="btn-gold min-h-10! px-4! text-sm">{t.edit}</Link>
          {s.status !== "draft" && <Link href={`/${locale}/events/${s.id}`} className="btn-ghost min-h-10! px-4! text-sm">{t.view}</Link>}
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{t.title}</h1>
          <p className="m-0 max-w-[640px] text-muted">{t.intro}</p>
        </div>
        <Link href={`/${locale}/admin/shows/new`} className="btn-gold">{t.new}</Link>
      </div>

      <section aria-labelledby="up-h" className="flex flex-col gap-3">
        <h2 id="up-h" className="m-0 font-display text-[22px] font-semibold">{t.upcoming}</h2>
        {!upcoming?.length ? <EmptyState title={t.none} /> : <ul className="m-0 flex list-none flex-col gap-4 p-0">{(upcoming as Row[]).map(card)}</ul>}
      </section>

      {!!past?.length && (
        <section aria-labelledby="past-h" className="flex flex-col gap-3">
          <h2 id="past-h" className="m-0 font-display text-[22px] font-semibold">{t.past}</h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">{(past as Row[]).map(card)}</ul>
        </section>
      )}
    </>
  );
}
