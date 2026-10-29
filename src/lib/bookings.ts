/**
 * Bookings of a public show, as the back office sees them: seat counts per
 * status and the door list as CSV.
 */
export const BOOKING_STATUSES = ["confirmed", "waitlist", "pending", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type Booking = {
  id: string; full_name: string; email: string; phone: string | null; seats: number; note: string | null;
  status: BookingStatus; created_at: string;
};

/** Seats per status, and how many are still free (null when the show has no seat limit). */
export function seatTotals(bookings: Pick<Booking, "seats" | "status">[], capacity: number | null) {
  const seats = { confirmed: 0, waitlist: 0, pending: 0, cancelled: 0 } as Record<BookingStatus, number>;
  for (const b of bookings) seats[b.status] += b.seats;
  const free = capacity == null ? null : capacity - seats.confirmed;
  return { seats, free, over: free != null && free < 0 };
}

/** One CSV cell: quoted, with formulas neutralised (a cell starting with = + - @ would run in a spreadsheet). */
function cell(v: string | number | null) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** The door list: a UTF-8 CSV with a BOM so spreadsheet apps read Arabic names correctly. */
export function bookingsCsv(bookings: Booking[], header: string[], statusLabel: (s: BookingStatus) => string, date: (iso: string) => string) {
  const rows = bookings.map((b) => [b.full_name, b.seats, statusLabel(b.status), b.phone, b.email, b.note, date(b.created_at)]);
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
