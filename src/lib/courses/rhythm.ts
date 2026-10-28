import type { TimedHit } from "../music/composer/timeline";
import { IQAAT } from "../music/rhythm/data/iqaat";
import { parseSkeleton, pulseSeconds } from "../music/rhythm/engine";
import type { Iqa, Stroke } from "../music/rhythm/types";

/**
 * Rhythm helpers for the iqaʿat course: timelines for the cycle player and the
 * drills, and the scoring of tap-along drills.
 */

export const getIqa = (id: string): Iqa | undefined => IQAAT.find((i) => i.id === id);

/** A cycle written as a skeleton ("D T . T D . T .") with its pulse value. */
export type Cycle = { skeleton: string; pulseUnit: 4 | 8 | 16; grouping?: number[] };

export const cycleOf = (iqa: Iqa): Cycle => ({
  skeleton: iqa.events.reduce((cells, e) => (cells[e.pulse] = e.stroke === "dum" ? "D" : e.stroke === "tak" ? "T" : "K", cells), Array(iqa.pulses).fill(".")).join(" "),
  pulseUnit: iqa.pulseUnit,
  grouping: iqa.grouping,
});

export type TimedStroke = { time: number; stroke: Stroke; pulse: number; cycle: number };

/**
 * Strokes of `cycles` repetitions, after an optional count-in of metronome
 * clicks (one cycle long, on the quarter-note beats). Times in seconds.
 */
export function cycleTimeline(cycle: Cycle, opts: { quarterBpm: number; cycles: number; countIn?: boolean; clicks?: boolean }) {
  const { pulses, events } = parseSkeleton(cycle.skeleton);
  const pulse = pulseSeconds(cycle, opts.quarterBpm);
  const length = pulses * pulse;
  const beat = 60 / opts.quarterBpm;
  const offset = opts.countIn ? Math.ceil(length / beat - 1e-9) * beat : 0;
  const strokes: TimedStroke[] = [];
  for (let c = 0; c < opts.cycles; c++) {
    for (const e of events) strokes.push({ time: offset + c * length + e.pulse * pulse, stroke: e.stroke, pulse: e.pulse, cycle: c });
  }
  const duration = offset + opts.cycles * length;
  const strokeHits: TimedHit[] = strokes.map((s) => ({ track: "percussion", time: s.time, stroke: s.stroke, velocity: s.pulse === 0 ? 0.95 : s.stroke === "ka" ? 0.6 : 0.8 }));
  // Clicks: a light tick on each quarter beat (count-in only, or all along).
  const clickUntil = opts.clicks ? duration : offset;
  const clickHits: TimedHit[] = [];
  for (let i = 0; i * beat < clickUntil - 1e-6; i++) {
    clickHits.push({ track: "percussion", time: i * beat, stroke: "ka", velocity: i * beat < offset ? 0.45 : 0.25 });
  }
  const hits = [...strokeHits, ...clickHits].sort((a, b) => a.time - b.time);
  return { strokes, hits, strokeHits, clickHits, duration, offset, pulse, length, pulses };
}

/** Which pulse of the cycle sounds at `t` seconds (−1 before the start or during the count-in). */
export function pulseAt(t: number, timing: { offset: number; pulse: number; pulses: number; duration: number }) {
  if (t < timing.offset || t >= timing.duration) return -1;
  return Math.floor((t - timing.offset) / timing.pulse + 1e-6) % timing.pulses;
}

/** Counting under each pulse: eighths "١ و ٢ و…", otherwise the pulse number. */
export function countLabels(cycle: Cycle): string[] {
  // Counted from the cells, so a grid with a hidden pulse ("?") works too.
  const n = cycle.skeleton.split(" ").length;
  const digits = "٠١٢٣٤٥٦٧٨٩";
  const ar = (v: number) => String(v).replace(/\d/g, (d) => digits[Number(d)]);
  if (cycle.pulseUnit === 8 && !cycle.grouping) return Array.from({ length: n }, (_, i) => (i % 2 ? "و" : ar(i / 2 + 1)));
  return Array.from({ length: n }, (_, i) => ar(i + 1));
}

export type Tap = { time: number; stroke: "dum" | "tak" };
export type TapScore = { hit: number; expected: number; extra: number; percent: number; perStroke: boolean[] };

/**
 * Tap-along score. Each expected stroke is matched by the nearest unused tap of
 * the right kind (ka is played with the tak hand) within `tolerance` seconds;
 * taps that match nothing count as extra and cost half a stroke each.
 */
export function scoreTaps(expected: { time: number; stroke: Stroke }[], taps: Tap[], tolerance: number): TapScore {
  const used = new Set<number>();
  const perStroke = expected.map((e) => {
    const kind = e.stroke === "dum" ? "dum" : "tak";
    let best = -1;
    let bestGap = Infinity;
    taps.forEach((t, i) => {
      const gap = Math.abs(t.time - e.time);
      if (!used.has(i) && t.stroke === kind && gap <= tolerance && gap < bestGap) {
        best = i;
        bestGap = gap;
      }
    });
    if (best >= 0) used.add(best);
    return best >= 0;
  });
  const hit = perStroke.filter(Boolean).length;
  const extra = taps.length - used.size;
  const percent = expected.length ? Math.max(0, Math.round(((hit - extra / 2) / expected.length) * 100)) : 0;
  return { hit, expected: expected.length, extra, percent, perStroke };
}
