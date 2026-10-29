import { hasLocale } from "@/i18n/config";
import { formatDate, getDictionary } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { bookingsCsv, type Booking } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The door list of a show (cancelled bookings left out), for printing or a spreadsheet. */
export async function GET(_req: Request, { params }: RouteContext<"/[lang]/admin/shows/[id]/bookings.csv">) {
  const { lang, id } = await params;
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return new Response("Forbidden", { status: 403 });
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const locale = hasLocale(lang) ? lang : "ar";
  const t = getDictionary(locale).admin.shows.bookings;

  const supabase = await createClient();
  const [{ data: show }, { data }] = await Promise.all([
    supabase.from("events").select("starts_at").eq("id", id).maybeSingle(),
    supabase.from("bookings").select("id, full_name, email, phone, seats, note, status, created_at").eq("event_id", id).neq("status", "cancelled").order("full_name"),
  ]);
  if (!show) return new Response("Not found", { status: 404 });

  const csv = bookingsCsv((data ?? []) as Booking[], [t.name, t.seats, t.status, t.phone, t.email, t.note, t.date], (s) => t.statuses[s], (d) => formatDate(locale, d));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${show.starts_at.slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
