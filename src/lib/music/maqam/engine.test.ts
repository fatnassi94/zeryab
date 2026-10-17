import { describe, expect, it } from "vitest";
import { hz } from "../pitch";
import { TONES, tonesAt, westernName } from "../notes";
import { edo53 } from "../tuning";
import { AJNAS } from "./data/ajnas";
import { MAQAMAT } from "./data/maqamat";
import {
  ajnasAt,
  degreesOf,
  getMaqam,
  modulationCandidates,
  nearestDegree,
  resolvePitch,
  toLessonFields,
  validateVariant,
} from "./engine";
import type { MaqamVariant } from "./types";

/**
 * Reference table a teacher can read and correct: cents above the tonic,
 * 24-tone theoretical values. Changing a maqam's data must update this table.
 */
const EXPECTED: Record<string, { asc: number[]; desc?: number[] }> = {
  "rast-mashriqi": { asc: [0, 200, 350, 500, 700, 900, 1050, 1200], desc: [0, 200, 350, 500, 700, 900, 1000, 1200] },
  "bayati-mashriqi": { asc: [0, 150, 300, 500, 700, 800, 1000, 1200] },
  "hijaz-mashriqi": { asc: [0, 100, 400, 500, 700, 800, 1000, 1200] },
  "nahawand-mashriqi": { asc: [0, 200, 300, 500, 700, 800, 1100, 1200], desc: [0, 200, 300, 500, 700, 800, 1000, 1200] },
  "saba-mashriqi": { asc: [0, 150, 300, 400, 700, 800, 1000, 1100] },
  "kurd-mashriqi": { asc: [0, 100, 300, 500, 700, 800, 1000, 1200] },
  "ajam-mashriqi": { asc: [0, 200, 400, 500, 700, 900, 1100, 1200] },
  "sikah-mashriqi": { asc: [0, 150, 350, 550, 700, 850, 1050, 1200] },
};

describe("maqam data", () => {
  it("covers exactly the reference table", () => {
    expect(MAQAMAT.map((m) => m.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(MAQAMAT.map((m) => [m.id, m] as const))("%s is internally consistent", (_id, m) => {
    expect(validateVariant(m)).toEqual([]);
  });

  it.each(Object.entries(EXPECTED))("%s has the expected degrees", (id, exp) => {
    const m = getMaqam(id);
    expect(degreesOf(m, "ascending")).toEqual(exp.asc);
    if (exp.desc) expect(degreesOf(m, "descending")).toEqual(exp.desc);
  });

  it("marks every maqam, jins and the tone table with provenance, still draft", () => {
    for (const m of MAQAMAT) expect(m.provenance.status).toBe("draft");
    for (const j of AJNAS) expect(j.provenance.source).toBeTruthy();
  });

  it("keeps Saba as a non-octave scale ending on Shahnaz (D♭)", () => {
    const saba = getMaqam("saba-mashriqi");
    expect(saba.octaveRepeating).toBe(false);
    expect(saba.ascending.at(-1)).toBe("shahnaz");
  });

  it("keeps enharmonic spellings distinct (Hijaz F♯ vs Saba G♭)", () => {
    expect(tonesAt(600).sort()).toEqual(["hijaz", "saba"]);
    expect(westernName("hijaz", "en")).toBe("F♯");
    expect(westernName("saba", "en")).toBe("G♭");
    expect(westernName("sikah", "ar")).toBe("مي ½♭");
    expect(westernName("sikah", "fr")).toBe("mi ½♭");
  });
});

describe("validation catches broken data", () => {
  const bayati = getMaqam("bayati-mashriqi");

  it("rejects a jins that does not fit its degree", () => {
    const broken: MaqamVariant = { ...bayati, lower: { jins: "hijaz", degree: 0 } };
    expect(validateVariant(broken)).toContain("lower jins hijaz does not fit at degree 0");
  });

  it("rejects a non-ascending scale and a missing octave", () => {
    const broken: MaqamVariant = { ...bayati, ascending: ["dukah", "jaharkah", "sikah", "nawa", "husayni", "ajam", "kirdan", "kirdan"] };
    const problems = validateVariant(broken);
    expect(problems.some((p) => p.includes("is not above"))).toBe(true);
    expect(problems.some((p) => p.includes("must end at 1200"))).toBe(true);
  });

  it("rejects an out-of-range ghammaz", () => {
    expect(validateVariant({ ...bayati, ghammaz: 9 })).toContain("ghammaz index 9 out of range");
  });
});

describe("queries", () => {
  const bayati = getMaqam("bayati-mashriqi");

  it("finds the ajnas around a degree (Nawa belongs to both in Bayati)", () => {
    expect(ajnasAt(bayati, 3).map((p) => p.jins)).toEqual(["bayati", "nahawand"]);
    expect(ajnasAt(bayati, 1).map((p) => p.jins)).toEqual(["bayati"]);
  });

  it("measures how far a performed note is from the nearest degree", () => {
    // A sikah sung 18¢ low in Bayati.
    expect(nearestDegree(bayati, 132)).toEqual({ degree: 1, octave: 0, deviation: -18 });
    // Same note an octave up.
    expect(nearestDegree(bayati, 1332)).toEqual({ degree: 1, octave: 1, deviation: -18 });
  });

  it("resolves absolute pitches without 12-TET rounding", () => {
    // Dukah (D4) ≈ 293.665 Hz; Sikah (E½♭4) = geometric mean of D♯4 (311.127) and E4 (329.628) ≈ 320.24 Hz.
    expect(hz(resolvePitch(bayati, 0))).toBeCloseTo(293.665, 2);
    expect(hz(resolvePitch(bayati, 1))).toBeCloseTo(Math.sqrt(311.127 * 329.628), 2);
    // Degree 8 = second degree one octave up.
    expect(resolvePitch(bayati, 8).cents - resolvePitch(bayati, 1).cents).toBe(1200);
    expect(resolvePitch(bayati, -1).cents).toBe(resolvePitch(bayati, 6).cents - 1200);
  });

  it("applies a tuning system at resolution time", () => {
    const sikahIn53 = resolvePitch(bayati, 1, { tuning: edo53 }).cents - resolvePitch(bayati, 0).cents;
    expect(sikahIn53).toBeCloseTo((1200 / 53) * 7, 6); // 150¢ → 7 commas ≈ 158.49¢
  });

  it("uses the descending form when asked (Rast's B♭)", () => {
    const rast = getMaqam("rast-mashriqi");
    expect(resolvePitch(rast, 6, { direction: "descending" }).cents - resolvePitch(rast, 0).cents).toBe(1000);
    expect(resolvePitch(rast, 6).cents - resolvePitch(rast, 0).cents).toBe(1050);
  });

  it("suggests modulations through shared ajnas", () => {
    const targets = modulationCandidates(bayati).map((t) => `${t.maqam}@${t.on}`);
    expect(targets).toContain("nahawand-mashriqi@nawa");
    const rastTargets = modulationCandidates(getMaqam("rast-mashriqi")).map((t) => t.maqam);
    expect(rastTargets).toEqual(expect.arrayContaining(["nahawand-mashriqi"]));
    expect(rastTargets).not.toContain("rast-mashriqi");
  });
});

describe("lesson page export", () => {
  it("produces the scale_notes / ajnas shape with jins start and ghammaz", () => {
    expect(toLessonFields(getMaqam("bayati-mashriqi"), "ar")).toEqual({
      scale_notes: ["دوكاه|ري", "سيكاه|مي ½♭", "جهاركاه|فا", "نوى|صول", "حسيني|لا", "عجم|سي ♭", "كردان|دو", "محيّر|ري"],
      ajnas: [
        { name: "بياتي — دوكاه", start: 0, notes: 4 },
        { name: "نهاوند — نوى", start: 3, notes: 4 },
      ],
      ghammaz: 3,
    });
  });

  it("puts Rast's ghammaz on Nawa (degree 4), not on the end of the lower jins", () => {
    const rast = toLessonFields(getMaqam("rast-mashriqi"), "en");
    expect(rast.ghammaz).toBe(4);
    expect(rast.ajnas[1]).toEqual({ name: "Rast — نوى", start: 4, notes: 4 });
  });

  it("every tone in the data exists in the tone table", () => {
    for (const m of MAQAMAT) for (const t of [...m.ascending, ...(m.descending ?? [])]) expect(TONES[t]).toBeDefined();
  });
});
