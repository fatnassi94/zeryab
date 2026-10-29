import { describe, expect, it } from "vitest";
import { bookingsCsv, seatTotals, type Booking } from "./bookings";

const b = (over: Partial<Booking>): Booking => ({
  id: "1", full_name: "سلمى", email: "s@x.tn", phone: null, seats: 2, note: null, status: "confirmed", created_at: "2026-11-01T10:00:00Z", ...over,
});

describe("bookings", () => {
  it("counts seats per status and what is left", () => {
    const t = seatTotals([b({}), b({ seats: 3, status: "waitlist" }), b({ seats: 1, status: "cancelled" })], 4);
    expect(t).toEqual({ seats: { confirmed: 2, waitlist: 3, pending: 0, cancelled: 1 }, free: 2, over: false });
    expect(seatTotals([b({ seats: 5 })], 4)).toMatchObject({ free: -1, over: true });
    expect(seatTotals([b({})], null)).toMatchObject({ free: null, over: false });
  });

  it("writes a door list spreadsheets open safely", () => {
    const csv = bookingsCsv([b({ full_name: '=HYPERLINK("x")', note: 'he said "hi"' })], ["name", "seats", "status", "phone", "email", "note", "date"], (s) => s, (d) => d.slice(0, 10));
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")","2","confirmed","","s@x.tn","he said ""hi""","2026-11-01"`);
  });
});
