import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeDrill } from "./drills";
import { getCourseContent } from "./index";
import { arabicNoteName, parseNotation } from "./notation";
import { courseProgress } from "./progress";
import { READING_NOTES } from "./reading-notes";
import { countLabels, cycleOf, cycleTimeline, getIqa, pulseAt, scoreTaps } from "./rhythm";
import { RHYTHMS } from "./rhythms";
import type { DrillKind } from "./types";

const SEED = readFileSync("supabase/migrations/20261027000014_reading_course.sql", "utf8");
const RHYTHM_SEED = readFileSync("supabase/migrations/20261028000015_rhythm_course.sql", "utf8");

/** Every bar is exactly full (a wrong value in a lesson would show a broken bar). */
function expectFullBars(notation: string) {
  const score = parseNotation(notation);
  for (const m of score.measures) {
    const used = m.notes.reduce((s, n) => s + n.duration, 0);
    expect(used, `${notation} bar ${m.number}`).toBe(m.length);
  }
}

describe("notation", () => {
  it("parses bars, values, dots and the time signature", () => {
    const s = parseNotation("3/4 | C4:h. | D4:q. E4:e F4:q");
    expect(s.measures).toHaveLength(2);
    expect(s.measures[0].time).toMatchObject({ beats: 3, beatType: 4 });
    expect(s.measures[0].notes[0]).toMatchObject({ type: "half", dots: 1, duration: 2880 });
    expect(s.measures[1].notes.map((n) => n.offset)).toEqual([0, 1440, 1920]);
    expect(s.measures[1].barline).toBe("final");
  });

  it("ties share one sound, also across a bar line", () => {
    const s = parseNotation("C5:h E5:h~ | E5:h D5:h");
    const [a, b] = [s.measures[0].notes[1], s.measures[1].notes[0]];
    expect(a.tieStart).toBe(true);
    expect(b.tieStop).toBe(true);
    expect(b.sourceId).toBe(a.sourceId);
  });

  it("writes the half flat a quarter tone below", () => {
    const e = parseNotation("Ed4:w").measures[0].notes[0].pitch!;
    expect(e.alter).toBe(-0.5);
    expect(e.cents).toBe(4 * 1200 + 350);
    expect(arabicNoteName(e)).toBe("مي نصف بيمول");
  });

  it("rejects bad tokens and overfull bars", () => {
    expect(() => parseNotation("H4:q")).toThrow();
    expect(() => parseNotation("C4:w C4:q")).toThrow();
  });
});

describe("reading course content", () => {
  it("every staff example has full bars", () => {
    for (const item of READING_NOTES.items) {
      if (item.kind !== "lesson") continue;
      for (const b of item.blocks) if ((b.t === "staff" || b.t === "practice") && b.notation) expectFullBars(b.notation);
    }
  });

  it("matches the database rows, in order", () => {
    expect(getCourseContent("reading-notes")).toBe(READING_NOTES);
    READING_NOTES.items.forEach((item, i) => {
      expect(SEED, item.slug).toContain(`('${item.slug}', '${item.title}', '${item.summary}', ${i + 1})`);
    });
  });

  it("the final test staves parse and every answer points at an option", () => {
    const rows = [...SEED.matchAll(/\((\d+), '(.+?)', '(\[.+?\])', (\d+), '/g)];
    expect(rows).toHaveLength(15);
    for (const [, , prompt, options, answer] of rows) {
      for (const [, n] of prompt.matchAll(/\[\[(.+?)\]\]/g)) expectFullBars(n);
      expect(Number(answer)).toBeLessThan(JSON.parse(options).length);
    }
  });
});

describe("drills", () => {
  const kinds: DrillKind[] = [
    "lineNotes", "spaceNotes", "staffNotes", "ledgerNotes", "noteValues", "rests", "meter", "dotsTies", "accidentals", "ear",
    "strokesEar", "countPulses", "completeCycle", "nameIqa", "iqaEar",
  ];

  it.each(kinds)("%s: ten valid questions", (kind) => {
    for (const seed of [1, 2, 3, 42, 2026]) {
      const qs = makeDrill(kind, seed);
      expect(qs).toHaveLength(10);
      for (const q of qs) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(new Set(q.options.map((o) => o.notation ?? o.label)).size).toBe(q.options.length);
        for (const n of [q.notation, q.listen, q.hear, ...q.options.map((o) => o.notation)]) if (n) expectFullBars(n);
      }
    }
  });

  it("is reproducible from its seed", () => {
    expect(makeDrill("meter", 7)).toEqual(makeDrill("meter", 7));
  });

  it("names the note that is written", () => {
    const q = makeDrill("lineNotes", 5)[0];
    const step = parseNotation(q.notation!).measures[0].notes[0].pitch!.step;
    expect(q.options[q.answer].label).toBe({ C: "دو", D: "ري", E: "مي", F: "فا", G: "صول", A: "لا", B: "سي" }[step]);
  });
});

describe("course progress", () => {
  const slugs = (kind: string) => READING_NOTES.items.filter((i) => i.kind === kind).map((i) => i.slug);

  it("climbs from not started to passed", () => {
    expect(courseProgress(READING_NOTES, new Set(), null)).toMatchObject({ level: 0, done: 0, next: "staff-and-clef" });
    expect(courseProgress(READING_NOTES, new Set(["staff-and-clef"]), null)).toMatchObject({ level: 1, done: 1, next: "note-names" });
    const lessons = new Set(slugs("lesson"));
    expect(courseProgress(READING_NOTES, lessons, null).level).toBe(2);
    const all = new Set([...slugs("lesson"), ...slugs("drill")]);
    expect(courseProgress(READING_NOTES, all, { score: 9, max: 15 })).toMatchObject({ level: 3, testPercent: 60, testPassed: false, next: "final-test" });
    expect(courseProgress(READING_NOTES, all, { score: 11, max: 15 })).toMatchObject({ level: 4, percent: 100, next: null });
  });
});

describe("rhythm course", () => {
  const maqsum = cycleOf(getIqa("maqsum")!);

  it("writes a cycle from the engine's iqaʿ", () => {
    expect(maqsum).toEqual({ skeleton: "D T . T D . T .", pulseUnit: 8, grouping: undefined });
    expect(countLabels(maqsum)).toEqual(["١", "و", "٢", "و", "٣", "و", "٤", "و"]);
    expect(countLabels(cycleOf(getIqa("samai-thaqil")!))).toHaveLength(10);
  });

  it("times strokes after a one-bar count-in", () => {
    const t = cycleTimeline(maqsum, { quarterBpm: 120, cycles: 2, countIn: true });
    expect(t.offset).toBeCloseTo(2, 9); // one 4/4 bar at ♩=120
    expect(t.strokes.slice(0, 5).map((s) => s.time)).toEqual([2, 2.25, 2.75, 3, 3.5]);
    expect(t.duration).toBeCloseTo(6, 9);
    expect(t.clickHits).toHaveLength(4); // count-in only
    expect(pulseAt(1.9, t)).toBe(-1);
    expect(pulseAt(2.3, t)).toBe(1);
    expect(pulseAt(4.0, t)).toBe(0); // second cycle
  });

  it("scores taps on timing and kind, extra taps cost half", () => {
    const expected = cycleTimeline(maqsum, { quarterBpm: 120, cycles: 1 }).strokes;
    const exact = expected.map((e) => ({ time: e.time + 0.03, stroke: e.stroke === "dum" ? ("dum" as const) : ("tak" as const) }));
    expect(scoreTaps(expected, exact, 0.1).percent).toBe(100);
    const wrongHand = exact.map((t) => ({ ...t, stroke: t.stroke === "dum" ? ("tak" as const) : ("dum" as const) }));
    expect(scoreTaps(expected, wrongHand, 0.1).hit).toBe(0);
    const late = exact.map((t) => ({ ...t, time: t.time + 0.2 }));
    expect(scoreTaps(expected, late, 0.1).hit).toBe(0);
    const extra = scoreTaps(expected, [...exact, { time: 0.4, stroke: "dum" }, { time: 0.6, stroke: "dum" }], 0.1);
    expect(extra).toMatchObject({ hit: 5, extra: 2, percent: 80 });
  });

  it("every lesson iqaʿ exists and every melody bar holds one cycle", () => {
    for (const item of RHYTHMS.items) {
      if (item.kind === "drill" && item.drill === "tap") expect(getIqa(item.iqa!), item.slug).toBeDefined();
      if (item.kind !== "lesson") continue;
      for (const b of item.blocks) {
        if (b.t === "iqa") expect(getIqa(b.iqa), b.iqa).toBeDefined();
        if (b.t === "staff" && b.iqa) {
          expectFullBars(b.notation);
          const iqa = getIqa(b.iqa)!;
          const bar = parseNotation(b.notation).measures[0].length;
          expect(bar, `${b.iqa} under ${b.notation}`).toBe((iqa.pulses * 4 * 960) / iqa.pulseUnit);
        }
      }
    }
  });

  it("matches the database rows, and the test points at real cycles", () => {
    RHYTHMS.items.forEach((item, i) => {
      expect(RHYTHM_SEED, item.slug).toContain(`('${item.slug}', '${item.title}', '${item.summary}', ${i + 1})`);
    });
    const rows = [...RHYTHM_SEED.matchAll(/\((\d+), '(.+?)', '(\[.+?\])', (\d+), '/g)];
    expect(rows).toHaveLength(12);
    for (const [, , prompt, options, answer] of rows) {
      for (const [, , id] of prompt.matchAll(/\[\[(iqa|listen):(.+?)\]\]/g)) expect(getIqa(id), id).toBeDefined();
      expect(Number(answer)).toBeLessThan(JSON.parse(options).length);
    }
  });

  it("complete-the-cycle hides exactly one pulse", () => {
    for (const q of makeDrill("completeCycle", 11)) expect(q.grid!.skeleton.split(" ").filter((c) => c === "?")).toHaveLength(1);
    expect(countLabels({ skeleton: "D ? . T", pulseUnit: 8 })).toEqual(["١", "و", "٢", "و"]);
  });

  it("the course is registered", () => {
    expect(getCourseContent("rhythms")).toBe(RHYTHMS);
  });
});
