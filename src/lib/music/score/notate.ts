import type { Clef, Measure, NoteType, ScoreNote, ScorePitch, TimeSignature } from "./types";
import { TPQ } from "./types";

/** A sounding event in absolute ticks (from the composer or a MIDI file). */
export type TimedEvent = { start: number; end: number; pitch: ScorePitch; sourceId: string; velocity?: number };

/** One bar of the frame the events are written into. */
export type BarFrame = { length: number; time: TimeSignature; clef: Clef; number?: string };

const VALUES: [NoteType, number][] = [
  ["whole", 4 * TPQ],
  ["half", 2 * TPQ],
  ["quarter", TPQ],
  ["eighth", TPQ / 2],
  ["16th", TPQ / 4],
  ["32nd", TPQ / 8],
  ["64th", TPQ / 16],
];

/** Plain or single-dotted value with exactly this length (double dots are avoided on purpose). */
export function valueOf(ticks: number): { type: NoteType; dots: number } | null {
  for (const [type, len] of VALUES) {
    if (ticks === len) return { type, dots: 0 };
    if (ticks === len * 1.5) return { type, dots: 1 };
  }
  return null;
}

/** Nominal length of a written value (without tuplet ratio). */
export function valueTicks(type: NoteType, dots: number): number {
  const base = VALUES.find(([t]) => t === type)![1];
  let len = base;
  for (let d = 1; d <= dots; d++) len += base / 2 ** d;
  return len;
}

function largestValueAtMost(ticks: number): { type: NoteType; dots: number; len: number } {
  for (const [type, len] of VALUES) {
    if (len * 1.5 <= ticks) return { type, dots: 1, len: len * 1.5 };
    if (len <= ticks) return { type, dots: 0, len };
  }
  return { type: "64th", dots: 0, len: ticks };
}

/**
 * Metric hierarchy of a bar: level(t) is 0 at the barline and grows for weaker
 * positions (half-bar, beat, half-beat…). Additive meters use their grouping
 * as the first level, so 3+2+2+3 shows its groups.
 */
export function metricLevels(time: TimeSignature, length: number) {
  const beat = (4 * TPQ) / time.beatType;
  const groupStarts = new Set<number>();
  if (time.grouping) time.grouping.reduce((at, g) => (groupStarts.add(at), at + g), 0);
  const compound = time.beatType === 8 && time.beats % 3 === 0 && time.beats > 3;
  const units: number[] = time.grouping
    ? []
    : compound
      ? time.beats === 12
        ? [6 * beat, 3 * beat]
        : [3 * beat]
      : time.beats === 6 && time.beatType === 4
        ? [3 * beat]
        : time.beats % 2 === 0 && time.beats >= 4
          ? [(time.beats / 2) * beat]
          : [];
  const fine = [beat, beat / 2, beat / 4, beat / 8, beat / 16].filter((u) => Number.isInteger(u) && u > 0);
  const ladder = [...units, ...fine.filter((u) => !units.includes(u))];
  const first = time.grouping ? 2 : 1;

  const level = (t: number): number => {
    if (t <= 0 || t >= length) return 0;
    if (groupStarts.has(t)) return 1;
    for (let i = 0; i < ladder.length; i++) if (t % ladder[i] === 0) return first + i;
    return first + ladder.length;
  };

  /** Most important boundary strictly inside (s, e), or undefined. */
  const strongestInside = (s: number, e: number): number | undefined => {
    const groups = [...groupStarts].filter((g) => g > s && g < e);
    if (groups.length) return groups[0];
    for (const u of ladder) {
      const m = (Math.floor(s / u) + 1) * u;
      if (m < e) return m;
    }
    return undefined;
  };

  /** True if (s, e) contains a boundary stronger (lower level) than `minLevel`. */
  const crosses = (s: number, e: number, minLevel: number): boolean => {
    if (minLevel > 1 && [...groupStarts].some((g) => g > s && g < e)) return true;
    return ladder.some((u, i) => first + i < minLevel && (Math.floor(s / u) + 1) * u < e);
  };

  return { level, strongestInside, crosses, beat };
}

type Piece = { offset: number; duration: number; type: NoteType; dots: number };

/**
 * Split [s, e) into written values. Notes may syncopate across weaker beats
 * (♪♩♪ in maqsum, ♩.♩.♩ in wahda) but not across stronger divisions; rests
 * always show the beat.
 */
function decompose(s: number, e: number, rest: boolean, m: ReturnType<typeof metricLevels>): Piece[] {
  if (e <= s) return [];
  const v = valueOf(e - s);
  const level = m.level(s);
  const minLevel = rest ? level : level - 2;
  if (v && !m.crosses(s, e, minLevel)) return [{ offset: s, duration: e - s, ...v }];
  const b = m.strongestInside(s, e);
  if (b === undefined) {
    const g = largestValueAtMost(e - s);
    return [{ offset: s, duration: g.len, type: g.type, dots: g.dots }, ...decompose(s + g.len, e, rest, m)];
  }
  return [...decompose(s, b, rest, m), ...decompose(b, e, rest, m)];
}

/** Rests filling [from, to) inside a bar, split so the beats stay visible. */
export function restPieces(from: number, to: number, time: TimeSignature, length: number): Piece[] {
  return decompose(from, to, true, metricLevels(time, length));
}

/**
 * Write timed events (monophonic, sorted, non-overlapping) into bars: notes
 * are split at barlines and metric boundaries with ties, gaps become rests,
 * empty bars get a whole-bar rest.
 */
export function notate(events: TimedEvent[], frames: BarFrame[]): Measure[] {
  const measures: Measure[] = [];
  let barStart = 0;
  let piece = 0;
  frames.forEach((frame, index) => {
    const barEnd = barStart + frame.length;
    const m = metricLevels(frame.time, frame.length);
    const notes: ScoreNote[] = [];
    let cursor = 0;
    const rest = (from: number, to: number) => {
      for (const p of decompose(from, to, true, m)) notes.push({ id: `r${index}.${p.offset}`, sourceId: `r${index}.${p.offset}`, ...p });
    };
    for (const ev of events) {
      if (ev.end <= barStart || ev.start >= barEnd) continue;
      const s = Math.max(ev.start, barStart) - barStart;
      const e = Math.min(ev.end, barEnd) - barStart;
      if (s > cursor) rest(cursor, s);
      const pieces = decompose(s, e, false, m);
      pieces.forEach((p, k) => {
        const first = k === 0 && ev.start >= barStart;
        const last = k === pieces.length - 1 && ev.end <= barEnd;
        notes.push({
          id: `n${piece++}`,
          sourceId: ev.sourceId,
          ...p,
          pitch: ev.pitch,
          velocity: ev.velocity,
          ...(first ? {} : { tieStop: true }),
          ...(last ? {} : { tieStart: true }),
        });
      });
      cursor = e;
    }
    if (!notes.length) {
      notes.push({ id: `r${index}`, sourceId: `r${index}`, offset: 0, duration: frame.length, type: "whole", dots: 0, measureRest: true });
    } else if (cursor < frame.length) {
      rest(cursor, frame.length);
    }
    measures.push({ number: frame.number ?? String(index + 1), length: frame.length, time: frame.time, clef: frame.clef, notes });
    barStart = barEnd;
  });
  return measures;
}
