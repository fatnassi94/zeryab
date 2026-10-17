import { describe, expect, it } from "vitest";
import { centsBetween, fromHz, fromMidi, hz, pitchBendValue, pitchClass, ratioToCents, toMidi } from "./pitch";
import { toScl } from "./scala";
import { edo24, edo53, profile, theoretical } from "./tuning";

describe("pitch ↔ frequency", () => {
  it("anchors A4 = 440 Hz and C4 = 261.626 Hz", () => {
    expect(hz({ cents: 5700 })).toBeCloseTo(440, 6);
    expect(hz({ cents: 4800 })).toBeCloseTo(261.6256, 3);
  });

  it("puts a quarter tone above A4 at ≈ 452.893 Hz (not rounded to a semitone)", () => {
    expect(hz({ cents: 5750 })).toBeCloseTo(452.893, 3);
  });

  it("supports a different reference pitch", () => {
    expect(hz({ cents: 5700 }, 442)).toBeCloseTo(442, 6);
  });

  it("round-trips Hz → cents → Hz", () => {
    for (const f of [55, 293.665, 320.24, 1000]) expect(hz(fromHz(f))).toBeCloseTo(f, 6);
  });

  it("measures intervals and just ratios", () => {
    expect(centsBetween(440, 880)).toBeCloseTo(1200, 9);
    expect(ratioToCents(3, 2)).toBeCloseTo(701.955, 3);
  });

  it("rejects non-positive frequencies", () => {
    expect(() => fromHz(0)).toThrow(RangeError);
  });
});

describe("MIDI boundary keeps microtones", () => {
  it("splits E½♭4 into MIDI E4 (64) with −50¢ detune", () => {
    expect(toMidi({ cents: 4800 + 350 })).toEqual({ note: 64, detuneCents: -50 });
  });

  it("maps A4 to MIDI 69 with no detune and back", () => {
    expect(toMidi({ cents: 5700 })).toEqual({ note: 69, detuneCents: 0 });
    expect(fromMidi(69).cents).toBe(5700);
    expect(fromMidi(64, -50).cents).toBe(5150);
  });

  it("normalises pitch bend to the declared bend range", () => {
    expect(pitchBendValue(-50)).toBe(-0.25); // default ±200¢
    expect(pitchBendValue(50, 100)).toBe(0.5);
    expect(() => pitchBendValue(250)).toThrow(RangeError);
  });

  it("reduces to a pitch class", () => {
    expect(pitchClass(1550)).toBe(350);
    expect(pitchClass(-150)).toBe(1050);
  });
});

describe("tuning systems", () => {
  it("24-EDO snaps to 50¢ steps", () => {
    expect(edo24.quantize(348)).toBe(350);
    expect(edo24.quantize(1012)).toBe(1000);
  });

  it("53-EDO snaps to Holdrian commas (≈22.642¢)", () => {
    expect(edo53.quantize(350)).toBeCloseTo((1200 / 53) * 15, 6);
  });

  it("theoretical system is a pass-through", () => {
    expect(theoretical.quantize(337.5)).toBe(337.5);
  });

  it("performance profiles add per-degree offsets", () => {
    const lowSikah = profile(theoretical, { 1: -16 }, {
      id: "test-profile",
      name: { ar: "", fr: "", en: "" },
      provenance: { source: "test", status: "draft" },
    });
    expect(lowSikah.offsetFor?.(1)).toBe(-16);
    expect(lowSikah.offsetFor?.(2)).toBe(0);
  });
});

describe("Scala export", () => {
  it("writes a valid .scl with cents values", () => {
    const scl = toScl("bayati", "Bayati (24-tone theory)", [150, 300, 500, 700, 800, 1000, 1200]);
    expect(scl).toBe(
      "! bayati.scl\n!\nBayati (24-tone theory)\n 7\n!\n 150.0\n 300.0\n 500.0\n 700.0\n 800.0\n 1000.0\n 1200.0\n",
    );
  });
});
