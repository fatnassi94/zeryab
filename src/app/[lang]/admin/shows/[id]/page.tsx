import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { fill, formatDate, formatNumber, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { BOOKING_STATUSES, seatTotals, type Booking, type BookingStatus } from "@/lib/bookings";
import { SHOW_KINDS, SHOW_STATUS_CHIP, tunisParts, type ShowKind, type ShowStatus } from "@/lib/shows";
import { createClient } from "@/lib/supabase/server";
import { deleteShow, setBookingStatus, setShowStatus } from "../actions";
import { AddBooking } from "./add-booking";
import { ShowForm } from "../show-form";

const BOOKING_CHIP: Record<BookingStatus, string> = {
  confirmed: "chip chip-teal", waitlist: "chip", pending: "chip", cancelled: "chip bg-white/8! text-muted!",
};

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
  const { created, b } = await searchParams;
  const filter = (BOOKING_STATUSES as readonly string[]).includes(String(b)) ? (b as BookingStatus) : null;
  const dict = getDictionary(locale);
  const t = dict.admin.shows;
  const status = show.status as ShowStatus;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, full_name, email, phone, seats, note, status, created_at")
    .eq("event_id", show.id)
    .order("created_at");
  const bookings = (data ?? []) as Booking[];
  const totals = seatTotals(bookings, show.capacity);
  const n = (v: number) => formatNumber(locale, v);
  const bt = t.bookings;
  const shown = filter ? bookings.filter((x) => x.status === filter) : bookings;
  const pageHref = `/${locale}/admin/shows/${show.id}`;
  const cell = "border-b border-white/6 px-2 py-3 align-top";
  const bookingButton = (x: Booking, to: BookingStatus, label: string) => (
    <form action={setBookingStatus}>
      <input type="hidden" name="id" value={x.id} />
      <input type="hidden" name="show" value={show.id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="status" value={to} />
      <button type="submit" className="btn-ghost min-h-9! px-3! text-[13px]">{label}</button>
    </form>
  );
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
            ? fill(t.bookingsSummary, { confirmed: n(totals.seats.confirmed), waiting: n(totals.seats.pending + totals.seats.waitlist) })
            : t.noBooking}
        </span>
        <span className="ms-auto flex flex-wrap gap-2">
          {status === "draft" && statusButton("published", t.publish, false)}
          {status === "published" && statusButton("draft", t.unpublish)}
          {status === "published" && statusButton("cancelled", t.cancel)}
          {status === "cancelled" && statusButton("published", t.restore)}
          {status !== "draft" && <Link href={`/${locale}/events/${show.id}`} className="btn-ghost min-h-10! px-4! text-sm">{t.view}</Link>}
          {status === "draft" && !bookings.length && (
            <form action={deleteShow}>
              <input type="hidden" name="id" value={show.id} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn-ghost min-h-10! px-4! text-sm text-rose!">{t.delete}</button>
            </form>
          )}
        </span>
      </section>

      <section id="bookings" aria-labelledby="bk-h" className="card flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="bk-h" className="m-0 font-display text-[24px] font-semibold">{bt.title}</h2>
          {bookings.length > 0 && <a href={`${pageHref}/bookings.csv`} className="btn-ghost min-h-10! px-4! text-sm" download>{bt.download}</a>}
        </div>

        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
          {[
            [bt.confirmedSeats, totals.seats.confirmed, "text-teal-light"],
            [bt.waitingSeats, totals.seats.waitlist + totals.seats.pending, "text-gold"],
            ...(totals.free != null ? [[totals.over ? bt.overSeats : bt.freeSeats, Math.abs(totals.free), totals.over ? "text-rose" : "text-text"]] : []),
            [bt.cancelledSeats, totals.seats.cancelled, "text-muted"],
          ].map(([label, v, cls]) => (
            <div key={label as string} className="rounded-2xl bg-white/4 p-4">
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className={`m-0 font-display text-[30px] font-semibold ${cls}`}>{n(v as number)}</dd>
            </div>
          ))}
        </dl>
        {totals.over && <Notice tone="error">{fill(bt.overWarning, { n: n(-totals.free!) })}</Notice>}

        {bookings.length > 0 && (
          <nav aria-label={bt.filter} className="flex flex-wrap gap-2">
            <Link href={`${pageHref}#bookings`} className={`chip min-h-10 no-underline ${!filter ? "border-gold/60! text-gold!" : ""}`}>{fill(bt.all, { n: n(bookings.length) })}</Link>
            {BOOKING_STATUSES.map((st) => {
              const count = bookings.filter((x) => x.status === st).length;
              return count ? (
                <Link key={st} href={`${pageHref}?b=${st}#bookings`} className={`chip min-h-10 no-underline ${filter === st ? "border-gold/60! text-gold!" : ""}`}>
                  {bt.statuses[st]} · {n(count)}
                </Link>
              ) : null;
            })}
          </nav>
        )}

        {!shown.length ? (
          <EmptyState title={bt.none} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[15px]">
              <thead>
                <tr className="text-[13px] text-muted">
                  {[bt.name, bt.seats, bt.contact, bt.status, bt.date, bt.action].map((h) => (
                    <th key={h} scope="col" className="border-b border-white/10 px-2 py-3 text-start font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((x) => (
                  <tr key={x.id} className={x.status === "cancelled" ? "opacity-55" : ""}>
                    <td className={cell}>
                      <div className="font-medium">{x.full_name}</div>
                      {x.note && <div className="mt-1 max-w-[260px] text-[13px] text-muted">{x.note}</div>}
                    </td>
                    <td className={`${cell} font-semibold tabular-nums`}>{n(x.seats)}</td>
                    <td className={`${cell} text-[13px]`} dir="ltr">
                      {x.phone && <div><a href={`tel:${x.phone}`}>{x.phone}</a></div>}
                      {x.email && <div className="text-muted"><a href={`mailto:${x.email}`} className="text-muted">{x.email}</a></div>}
                    </td>
                    <td className={cell}><span className={BOOKING_CHIP[x.status]}>{bt.statuses[x.status]}</span></td>
                    <td className={`${cell} text-[13px] text-muted`}>{formatDate(locale, x.created_at)} · {formatTime(locale, x.created_at)}</td>
                    <td className="border-b border-white/6 p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {x.status !== "confirmed" && x.status !== "cancelled" && bookingButton(x, "confirmed", bt.confirm)}
                        {x.status === "confirmed" && bookingButton(x, "waitlist", bt.toWaitlist)}
                        {x.status !== "cancelled" ? bookingButton(x, "cancelled", bt.cancel) : bookingButton(x, "waitlist", bt.restore)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="rounded-2xl border border-white/10">
          <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 font-medium text-gold">+ {bt.addTitle}</summary>
          <div className="border-t border-white/8 p-4">
            <AddBooking show={show.id} locale={locale} labels={bt.form} />
          </div>
        </details>
      </section>

      <section aria-labelledby="det-h" className="card flex flex-col gap-5 p-6 sm:p-8">
        <h2 id="det-h" className="m-0 font-display text-[24px] font-semibold">{t.detailsTitle}</h2>
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
