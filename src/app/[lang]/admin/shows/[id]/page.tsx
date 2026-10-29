import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui/notice";
import { fill, formatNumber, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { SHOW_KINDS, SHOW_STATUS_CHIP, tunisParts, type ShowKind, type ShowStatus } from "@/lib/shows";
import { createClient } from "@/lib/supabase/server";
import { deleteShow, setShowStatus } from "../actions";
import { ShowForm } from "../show-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Props = PageProps<"/[lang]/admin/shows/[id]">;

async function getShow(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, kind, title, summary, description, venue, address, map_url, starts_at, ends_at, is_bookable, capacity, price_tnd, booking_closes_at, status")
    .eq("id", id)
    .eq("visibility", "public")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getShow(id))?.title };
}

/** One public show: its form, status buttons and bookings count. */
export default async function ShowAdminPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  await requireRole(locale, ["activity_manager"]);
  const { id } = await params;
  const show = await getShow(id);
  if (!show) notFound();
  const { created } = await searchParams;
  const dict = getDictionary(locale);
  const t = dict.admin.shows;
  const status = show.status as ShowStatus;

  const supabase = await createClient();
  const { data: bookings } = await supabase.from("bookings").select("seats, status").eq("event_id", show.id);
  const seats = (st: string) => (bookings ?? []).filter((b) => b.status === st).reduce((sum, b) => sum + b.seats, 0);
  const n = (v: number) => formatNumber(locale, v);
  const start = tunisParts(show.starts_at);
  const closes = tunisParts(show.booking_closes_at);

  const statusButton = (to: ShowStatus, label: string, ghost = true) => (
    <form action={setShowStatus}>
      <input type="hidden" name="id" value={show.id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="status" value={to} />
      <button type="submit" className={`${ghost ? "btn-ghost" : "btn-gold"} min-h-10! px-4! text-sm`}>{label}</button>
    </form>
  );

  return (
    <>
      <Link href={`/${locale}/admin/shows`} className="text-sm">{t.back}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{show.title}</h1>
        <span className={SHOW_STATUS_CHIP[status]}>{t.statuses[status]}</span>
      </div>
      {created === "1" && <Notice tone="success">{t.created}</Notice>}

      <section aria-label={t.actions} className="card flex flex-wrap items-center gap-3 p-5">
        <span className="text-sm text-muted">
          {show.is_bookable
            ? fill(t.bookingsSummary, { confirmed: n(seats("confirmed")), waiting: n(seats("pending") + seats("waitlist")) })
            : t.noBooking}
        </span>
        <span className="ms-auto flex flex-wrap gap-2">
          {status === "draft" && statusButton("published", t.publish, false)}
          {status === "published" && statusButton("draft", t.unpublish)}
          {status === "published" && statusButton("cancelled", t.cancel)}
          {status === "cancelled" && statusButton("published", t.restore)}
          {status !== "draft" && <Link href={`/${locale}/events/${show.id}`} className="btn-ghost min-h-10! px-4! text-sm">{t.view}</Link>}
          {status === "draft" && !bookings?.length && (
            <form action={deleteShow}>
              <input type="hidden" name="id" value={show.id} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn-ghost min-h-10! px-4! text-sm text-rose!">{t.delete}</button>
            </form>
          )}
        </span>
      </section>

      <section className="card p-6 sm:p-8">
        <ShowForm
          key={`${show.id}-${status}`}
          locale={locale}
          labels={{ ...t.form, kinds: dict.events.kinds, statuses: t.statuses }}
          values={{
            id: show.id,
            kind: (SHOW_KINDS as readonly string[]).includes(show.kind) ? (show.kind as ShowKind) : "other",
            title: show.title, summary: show.summary ?? "", description: show.description ?? "",
            date: start.date, time: start.time, endTime: tunisParts(show.ends_at).time,
            venue: show.venue ?? "", address: show.address ?? "", mapUrl: show.map_url ?? "",
            bookable: show.is_bookable, capacity: show.capacity ? String(show.capacity) : "",
            price: show.price_tnd == null ? "" : String(show.price_tnd),
            closesDate: closes.date, closesTime: closes.time, status,
          }}
        />
      </section>
    </>
  );
}
