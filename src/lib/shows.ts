/**
 * Public shows managed from the back office (rows of `events` with
 * visibility 'public'): the form's rules, and club time (Tunis, UTC+1 all year).
 */
export const SHOW_KINDS = ["concert", "workshop", "other"] as const;
export type ShowKind = (typeof SHOW_KINDS)[number];
export const SHOW_STATUSES = ["draft", "published", "cancelled", "completed"] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];
/** Chip style of each status in the back office. */
export const SHOW_STATUS_CHIP: Record<ShowStatus, string> = {
  draft: "chip bg-white/8! text-muted!", published: "chip chip-teal", cancelled: "chip bg-rose/15! text-rose!", completed: "chip",
};

export type ShowField =
  | "kind" | "title" | "summary" | "description" | "date" | "time" | "endTime" | "venue" | "address" | "mapUrl"
  | "capacity" | "price" | "closes" | "status";

export type ShowRow = {
  kind: ShowKind;
  title: string;
  summary: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  map_url: string | null;
  is_bookable: boolean;
  capacity: number | null;
  price_tnd: number | null;
  booking_closes_at: string | null;
  status: ShowStatus;
};

const TUNIS = "+01:00";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** A Tunis date and time ("2026-11-20", "20:30") as an instant, or null. */
export function tunisInstant(date: string, time: string): Date | null {
  if (!DATE.test(date) || !TIME.test(time)) return null;
  const d = new Date(`${date}T${time}:00${TUNIS}`);
  if (Number.isNaN(d.getTime())) return null;
  // No silent roll-over (31 February would become 3 March).
  const back = tunisParts(d.toISOString());
  return back.date === date && back.time === time ? d : null;
}

/** The Tunis date and time of an instant, for filling the form. */
export function tunisParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(new Date(iso).getTime() + 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

/** Checks the show form; returns the row to store or the fields to fix. */
export function parseShow(get: (key: string) => string): { row: ShowRow } | { errors: Partial<Record<ShowField, true>> } {
  const f = (k: string) => get(k).trim();
  const errors: Partial<Record<ShowField, true>> = {};
  const text = (k: ShowField, max: number, min = 0) => {
    const v = f(k);
    if (v.length < min || v.length > max) errors[k] = true;
    return v || null;
  };

  const kind = f("kind") as ShowKind;
  if (!SHOW_KINDS.includes(kind)) errors.kind = true;
  const title = text("title", 140, 3) ?? "";
  const summary = text("summary", 300);
  const description = text("description", 4000);
  const venue = text("venue", 140);
  const address = text("address", 200);
  const mapUrl = text("mapUrl", 500);
  if (mapUrl && !/^https:\/\/\S+$/.test(mapUrl)) errors.mapUrl = true;

  const starts = tunisInstant(f("date"), f("time"));
  if (!starts) errors[DATE.test(f("date")) ? "time" : "date"] = true;
  let ends: Date | null = null;
  if (f("endTime")) {
    ends = tunisInstant(f("date"), f("endTime"));
    // A show that ends after midnight ends the next day.
    if (ends && starts && ends <= starts) ends = new Date(ends.getTime() + 24 * 3600 * 1000);
    if (!ends) errors.endTime = true;
  }

  const bookable = f("bookable") === "on";
  let capacity: number | null = null;
  if (f("capacity")) {
    capacity = Number(f("capacity"));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) errors.capacity = true;
  }
  let price: number | null = null;
  if (f("price")) {
    price = Number(f("price").replace(",", "."));
    if (!Number.isFinite(price) || price < 0 || price > 10000) errors.price = true;
    else price = Math.round(price * 1000) / 1000;
  }
  let closes: Date | null = null;
  if (f("closesDate") || f("closesTime")) {
    closes = tunisInstant(f("closesDate"), f("closesTime") || "23:59");
    if (!closes || (starts && closes > starts)) errors.closes = true;
  }

  const status = f("status") as ShowRow["status"];
  if (!SHOW_STATUSES.includes(status)) errors.status = true;

  if (Object.keys(errors).length) return { errors };
  return {
    row: {
      kind, title, summary, description, venue, address, map_url: mapUrl,
      starts_at: starts!.toISOString(),
      ends_at: ends?.toISOString() ?? null,
      is_bookable: bookable,
      capacity,
      price_tnd: price,
      booking_closes_at: closes?.toISOString() ?? null,
      status,
    },
  };
}
