import { describe, expect, it } from "vitest";
import { IQAAT } from "./data/iqaat";
import { cycleSeconds, parseSkeleton, pulseSeconds, schedule, toSkeleton, validateIqa } from "./engine";
import type { Iqa } from "./types";

const byId = (id: string) => IQAAT.find((i) => i.id === id)!;

describe("skeleton notation", () => {
  it("parses dum/tak/ka, rests and accents", () => {
    expect(parseSkeleton("D! T . K")).toEqual({
      pulses: 4,
      events: [
        { pulse: 0, stroke: "dum", accent: 2 },
        { pulse: 1, stroke: "tak" },
        { pulse: 3, stroke: "ka" },
      ],
    });
  });

  it("rejects unknown symbols", () => {
    expect(() => parseSkeleton("D X")).toThrow(/Unknown stroke "X"/);
  });

  it.each(IQAAT.map((i) => [i.id, i] as const))("%s round-trips and validates", (_id, iqa) => {
    expect(parseSkeleton(toSkeleton(iqa)).events).toEqual(iqa.events);
    expect(validateIqa(iqa)).toEqual([]);
  });
});

describe("starter cycles (draft, for percussionist review)", () => {
  it("encodes the commonly taught skeletons", () => {
    expect(toSkeleton(byId("maqsum"))).toBe("D T . T D . T .");
    expect(toSkeleton(byId("baladi"))).toBe("D D . T D . T .");
    expect(toSkeleton(byId("saidi"))).toBe("D T . D D . T .");
    expect(toSkeleton(byId("samai-thaqil"))).toBe("D . . T . D D T . .");
  });

  it("samai thaqil is 10 pulses grouped 3+2+2+3", () => {
    const s = byId("samai-thaqil");
    expect(s.pulses).toBe(10);
    expect(s.grouping).toEqual([3, 2, 2, 3]);
  });

  it("does not encode Tunisian cycles without a source", () => {
    expect(IQAAT.every((i) => i.tradition === "mashriqi")).toBe(true);
  });
});

describe("validation", () => {
  const base = byId("maqsum");
  it("catches events outside the cycle and bad groupings", () => {
    const broken: Iqa = { ...base, events: [...base.events, { pulse: 9, stroke: "tak" }], grouping: [3, 3] };
    const problems = validateIqa(broken);
    expect(problems).toContain("event at pulse 9 is outside the cycle");
    expect(problems).toContain("grouping does not sum to pulses");
  });
});

describe("scheduling", () => {
  const maqsum = byId("maqsum");

  it("computes pulse length from a quarter-note tempo", () => {
    expect(pulseSeconds(maqsum, 120)).toBeCloseTo(0.25, 12); // eighths at ♩=120
    expect(pulseSeconds(byId("malfuf"), 120)).toBeCloseTo(0.125, 12); // sixteenths
    expect(cycleSeconds(maqsum, 120)).toBeCloseTo(2, 12);
  });

  it("places strokes at absolute times", () => {
    const s = schedule(maqsum, { quarterBpm: 120, cycles: 2, startTime: 1 });
    expect(s.map((e) => e.time)).toEqual([1, 1.25, 1.75, 2, 2.5, 3, 3.25, 3.75, 4, 4.5]);
    expect(s[5]).toMatchObject({ cycle: 1, pulse: 0, stroke: "dum" });
  });

  it("does not drift over long sessions (5 minutes at ♩=120)", () => {
    const cycles = 150; // 150 × 2 s = 300 s
    const s = schedule(maqsum, { quarterBpm: 120, cycles });
    const last = s[s.length - 1];
    const exact = ((cycles - 1) * maqsum.pulses + last.pulse) * 0.25;
    expect(Math.abs(last.time - exact)).toBeLessThan(1e-9);
  });

  it("rejects a non-positive tempo", () => {
    expect(() => schedule(maqsum, { quarterBpm: 0, cycles: 1 })).toThrow(RangeError);
  });
});
