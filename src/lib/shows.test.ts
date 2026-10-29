import { describe, expect, it } from "vitest";
import { parseShow, tunisInstant, tunisParts } from "./shows";

const form = (over: Record<string, string> = {}) => {
  const base: Record<string, string> = {
    kind: "concert", title: "العقد الخالص", date: "2026-12-12", time: "20:30", status: "published", ...over,
  };
  return (k: string) => base[k] ?? "";
};

describe("shows", () => {
  it("reads club time as Tunis time and back", () => {
    expect(tunisInstant("2026-12-12", "20:30")!.toISOString()).toBe("2026-12-12T19:30:00.000Z");
    expect(tunisParts("2026-12-12T23:30:00.000Z")).toEqual({ date: "2026-12-13", time: "00:30" });
    expect(tunisInstant("2026-02-31", "20:30")).toBeNull();
  });

  it("builds the row of a free show without seats", () => {
    const r = parseShow(form());
    expect("row" in r && r.row).toMatchObject({ kind: "concert", is_bookable: false, capacity: null, price_tnd: null, ends_at: null, status: "published" });
  });

  it("ends the next day after midnight and reads a price with a comma", () => {
    const r = parseShow(form({ endTime: "00:30", price: "12,5", capacity: "200", bookable: "on" }));
    expect("row" in r && r.row).toMatchObject({ ends_at: "2026-12-12T23:30:00.000Z", price_tnd: 12.5, capacity: 200, is_bookable: true });
  });

  it("names the fields to fix", () => {
    const r = parseShow(form({ title: "ab", kind: "rehearsal", time: "8pm", capacity: "0", price: "-1", mapUrl: "javascript:alert(1)", status: "x" }));
    expect("errors" in r && Object.keys(r.errors).sort()).toEqual(["capacity", "kind", "mapUrl", "price", "status", "time", "title"]);
    const late = parseShow(form({ closesDate: "2026-12-20" })); // booking closing after the show
    expect("errors" in late && late.errors).toEqual({ closes: true });
  });
});
