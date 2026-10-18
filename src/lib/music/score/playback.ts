import type { TimedHit, TimedNote } from "../composer/timeline";
import { hz, round6, type Cents } from "../pitch";
import type { Iqa } from "../rhythm/types";
import { theoretical, type TuningSystem } from "../tuning";
import { TPQ, type Score } from "./types";

/**
 * Score → timed events for the audio engine (same shape as the composer's
 * timeline, so the Player, offline rendering and voices are shared).
 */

/** Bar indices in playing order: repeats and volta endings unfolded (D.C./D.S. are not followed). */
export function playOrder(score: Score): number[] {
  const ms = score.measures;
  const order: number[] = [];
  const taken = new Map<number, number>();
  let start = 0;
  let pass = 1;
  let inEnding = false;
  for (let i = 0, guard = 0; i < ms.length && guard < ms.length * 16; guard++) {
    const m = ms[i];
    if (m.repeatStart && i !== start) {
      start = i;
      pass = 1;
    }
    if (m.ending) {
      inEnding = true;
      if (!m.ending.numbers.includes(pass)) {
        i++;
        continue;
      }
    } else if (inEnding) {
      // Leaving the volta endings forward: the repeated section is over.
      inEnding = false;
      pass = 1;
      start = i;
    }
    order.push(i);
    if (m.repeatEnd) {
      const done = taken.get(i) ?? 0;
      if (done < m.repeatEnd - 1) {
        taken.set(i, done + 1);
        pass++;
        inEnding = false;
        i = start;
        continue;
      }
      taken.delete(i);
      if (!m.ending) {
        pass = 1;
        start = i + 1;
      }
    }
    i++;
  }
  return order;
}

export type SoundingNote = { start: number; end: number; cents: Cents; velocity: number; sourceId: string };

/** Sounding notes in unfolded ticks (tied pieces joined) plus the tempo map. */
export function soundingNotes(score: Score) {
  const notes: SoundingNote[] = [];
  const tempos: { tick: number; bpm: number }[] = [{ tick: 0, bpm: score.tempo }];
  const bars: { start: number; length: number; index: number }[] = [];
  let tick = 0;
  let open: SoundingNote | null = null;
  for (const index of playOrder(score)) {
    const m = score.measures[index];
    bars.push({ start: tick, length: m.length, index });
    for (const t of m.tempos ?? []) tempos.push({ tick: tick + t.offset, bpm: t.bpm });
    for (const n of m.notes) {
      if (!n.pitch) {
        open = null;
        continue;
      }
      const start = tick + n.offset;
      const end = start + n.duration;
      if (n.tieStop && open && open.cents === n.pitch.cents && Math.abs(open.end - start) <= 2) {
        open.end = end;
      } else {
        open = { start, end, cents: n.pitch.cents, velocity: n.velocity ?? 0.8, sourceId: n.sourceId };
        notes.push(open);
      }
      if (!n.tieStart) open = null;
    }
    tick += m.length;
  }
  tempos.sort((a, b) => a.tick - b.tick);
  return { notes, tempos, bars, totalTicks: tick };
}

/** Seconds at a tick for a tempo map; `scale` multiplies every tempo (the tempo slider). */
export function secondsAt(tempos: { tick: number; bpm: number }[], tick: number, scale = 1): number {
  let s = 0;
  for (let i = 0; i < tempos.length; i++) {
    const from = tempos[i].tick;
    if (tick <= from) break;
    const to = Math.min(tick, tempos[i + 1]?.tick ?? Infinity);
    s += ((to - from) / TPQ) * (60 / (tempos[i].bpm * scale));
  }
  return s;
}

export type ScoreTimelineOptions = {
  /** Quarter-note BPM wanted for the opening tempo; later changes keep their ratio. */
  quarterBpm?: number;
  tuning?: TuningSystem;
  drone?: boolean;
  /** Accompaniment cycle; played in every bar whose length equals one cycle. */
  iqa?: Iqa;
  a4?: number;
};

/** Pitch of the final note: the usual resting tone (qarar) of a melody, used for the drone and tuning. */
export function finalPitch(score: Score): Cents | undefined {
  const { notes } = soundingNotes(score);
  return notes[notes.length - 1]?.cents;
}

export function scoreTimeline(score: Score, opts: ScoreTimelineOptions = {}) {
  const { notes, tempos, bars, totalTicks } = soundingNotes(score);
  const scale = opts.quarterBpm ? opts.quarterBpm / score.tempo : 1;
  const a4 = opts.a4 ?? 440;
  const tuning = opts.tuning ?? theoretical;
  const tonic = notes[notes.length - 1]?.cents ?? 0;
  const tune = (c: Cents) => (tuning === theoretical ? c : round6(tonic + tuning.quantize(c - tonic)));
  const at = (t: number) => secondsAt(tempos, t, scale);

  const melody: TimedNote[] = notes.map((n) => {
    const time = at(n.start);
    const pitch = { cents: tune(n.cents) };
    return { track: "melody", noteId: n.sourceId, time, duration: at(n.end) - time, pitch, frequency: hz(pitch, a4), velocity: n.velocity };
  });
  const duration = at(totalTicks);

  // Drone on the final note, placed between B♭2 and A3.
  const drone: TimedNote[] = [];
  if (opts.drone && notes.length) {
    let c = tonic;
    while (c >= 4600) c -= 1200;
    while (c < 3400) c += 1200;
    const pitch = { cents: c };
    drone.push({ track: "drone", time: 0, duration, pitch, frequency: hz(pitch, a4), velocity: 0.35 });
  }

  const percussion: TimedHit[] = [];
  if (opts.iqa) {
    const pulse = (4 * TPQ) / opts.iqa.pulseUnit;
    const cycle = opts.iqa.pulses * pulse;
    for (const bar of bars) {
      if (bar.length !== cycle) continue;
      for (const e of opts.iqa.events) {
        percussion.push({ track: "percussion", time: at(bar.start + e.pulse * pulse), stroke: e.stroke, velocity: e.pulse === 0 ? 0.9 : e.stroke === "dum" ? 0.75 : 0.6 });
      }
    }
  }

  return { melody, drone, percussion, duration, pulseSeconds: 60 / (score.tempo * scale) };
}
