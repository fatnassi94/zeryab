import type { Iqa, RhythmEvent, Stroke } from "./types";

const STROKES: Record<string, Stroke> = { D: "dum", T: "tak", K: "ka" };

/**
 * Parse a skeleton written one symbol per pulse: "D T . T D . T ."
 * D = dum, T = tak, K = ka, "." = rest. A trailing "!" marks an accent (e.g. "D!").
 */
export function parseSkeleton(skeleton: string): { pulses: number; events: RhythmEvent[] } {
  const symbols = skeleton.trim().split(/\s+/);
  const events: RhythmEvent[] = [];
  symbols.forEach((raw, pulse) => {
    if (raw === ".") return;
    const accent = raw.endsWith("!");
    const stroke = STROKES[raw.replace("!", "").toUpperCase()];
    if (!stroke) throw new Error(`Unknown stroke "${raw}" at pulse ${pulse}`);
    events.push(accent ? { pulse, stroke, accent: 2 } : { pulse, stroke });
  });
  return { pulses: symbols.length, events };
}

/** Back to the one-symbol-per-pulse notation (useful for review and tests). */
export function toSkeleton(iqa: Pick<Iqa, "pulses" | "events">): string {
  const cells = Array.from({ length: iqa.pulses }, () => ".");
  for (const e of iqa.events) cells[e.pulse] = { dum: "D", tak: "T", ka: "K" }[e.stroke] + (e.accent === 2 ? "!" : "");
  return cells.join(" ");
}

export function validateIqa(iqa: Iqa): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(iqa.pulses) || iqa.pulses < 1) problems.push("pulses must be a positive integer");
  for (const e of iqa.events) {
    if (e.pulse < 0 || e.pulse >= iqa.pulses) problems.push(`event at pulse ${e.pulse} is outside the cycle`);
  }
  const pulsesUsed = iqa.events.map((e) => e.pulse);
  if (new Set(pulsesUsed).size !== pulsesUsed.length) problems.push("two strokes on the same pulse");
  if (iqa.grouping && iqa.grouping.reduce((a, b) => a + b, 0) !== iqa.pulses) problems.push("grouping does not sum to pulses");
  if (iqa.events[0]?.stroke !== "dum") problems.push("cycle should start with a dum");
  if (!iqa.provenance?.source) problems.push("missing provenance");
  return problems;
}

/** Seconds per pulse at a tempo given as quarter notes per minute. */
export const pulseSeconds = (iqa: Pick<Iqa, "pulseUnit">, quarterBpm: number) => (60 / quarterBpm) * (4 / iqa.pulseUnit);

export type ScheduledStroke = RhythmEvent & { time: number; cycle: number };

/**
 * Absolute times for `cycles` repetitions starting at `startTime` (seconds on
 * the audio clock). Each time is computed from its absolute pulse index, never
 * by accumulating durations, so there is no drift over long sessions.
 */
export function schedule(iqa: Iqa, opts: { quarterBpm: number; cycles: number; startTime?: number }): ScheduledStroke[] {
  if (!(opts.quarterBpm > 0)) throw new RangeError("Tempo must be positive");
  const step = pulseSeconds(iqa, opts.quarterBpm);
  const start = opts.startTime ?? 0;
  const out: ScheduledStroke[] = [];
  for (let cycle = 0; cycle < opts.cycles; cycle++) {
    for (const e of iqa.events) {
      out.push({ ...e, cycle, time: start + (cycle * iqa.pulses + e.pulse) * step });
    }
  }
  return out;
}

/** Duration of one full cycle in seconds. */
export const cycleSeconds = (iqa: Iqa, quarterBpm: number) => iqa.pulses * pulseSeconds(iqa, quarterBpm);
