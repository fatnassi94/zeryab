import { getMaqam, resolvePitch } from "../maqam/engine";
import { hz, type Pitch } from "../pitch";
import { pulseSeconds } from "../rhythm/engine";
import { edo24, edo53, theoretical, type TuningSystem } from "../tuning";
import { getIqa } from "./generate";
import type { Composition } from "./types";

export const TUNINGS: Record<string, TuningSystem> = {
  theoretical,
  "24-edo": edo24,
  "53-edo": edo53,
};

export type TimedNote = { track: "melody" | "drone"; noteId?: string; time: number; duration: number; pitch: Pitch; frequency: number; velocity: number };
export type TimedHit = { track: "percussion"; time: number; stroke: "dum" | "tak" | "ka"; velocity: number };

/**
 * Composition → absolute, timed events (seconds, Hz). This is the single bridge
 * between notation and sound, shared by live playback, offline rendering and
 * MIDI export, so they cannot disagree.
 */
export function toTimeline(c: Composition, opts: { a4?: number } = {}) {
  const variant = getMaqam(c.maqamId);
  const iqa = getIqa(c.iqaId);
  const tuning = TUNINGS[c.tuningId] ?? theoretical;
  const step = pulseSeconds(iqa, c.quarterBpm);
  const a4 = opts.a4 ?? 440;
  const duration = c.cycles * iqa.pulses * step;

  const melody: TimedNote[] = c.notes.map((n) => {
    const pitch = resolvePitch(variant, n.degree, { direction: n.direction, tuning });
    return {
      track: "melody",
      noteId: n.id,
      time: n.startPulse * step,
      duration: n.durationPulses * step,
      pitch,
      frequency: hz(pitch, a4),
      velocity: n.velocity,
    };
  });

  // Drone: tonic one octave below the melody's tonic, held for the whole piece.
  const tonic = resolvePitch(variant, 0, { tuning });
  const dronePitch = { cents: tonic.cents - 1200 };
  const drone: TimedNote[] = c.drone
    ? [{ track: "drone", time: 0, duration, pitch: dronePitch, frequency: hz(dronePitch, a4), velocity: 0.35 }]
    : [];

  const percussion: TimedHit[] = [];
  if (c.percussion) {
    for (let cycle = 0; cycle < c.cycles; cycle++) {
      for (const e of iqa.events) {
        percussion.push({
          track: "percussion",
          time: (cycle * iqa.pulses + e.pulse) * step,
          stroke: e.stroke,
          velocity: e.pulse === 0 ? 0.9 : e.stroke === "dum" ? 0.75 : 0.6,
        });
      }
    }
  }

  return { melody, drone, percussion, duration, pulseSeconds: step };
}

/**
 * The maqam scale played up (ascending form) then down (descending form),
 * one note per beat — for ear training before listening to a melody.
 */
export function scaleTimeline(maqamId: string, tuningId: string, quarterBpm = 90) {
  const variant = getMaqam(maqamId);
  const tuning = TUNINGS[tuningId] ?? theoretical;
  const beat = 60 / quarterBpm;
  const top = variant.ascending.length - 1;
  const steps: { degree: number; direction: "ascending" | "descending" }[] = [
    ...Array.from({ length: top + 1 }, (_, d) => ({ degree: d, direction: "ascending" as const })),
    ...Array.from({ length: top }, (_, k) => ({ degree: top - 1 - k, direction: "descending" as const })),
  ];
  const melody: TimedNote[] = steps.map((s, i) => {
    const pitch = resolvePitch(variant, s.degree, { direction: s.direction, tuning });
    const last = i === steps.length - 1;
    return { track: "melody", time: i * beat, duration: last ? beat * 2 : beat, pitch, frequency: hz(pitch), velocity: 0.8 };
  });
  return { melody, drone: [] as TimedNote[], percussion: [] as TimedHit[], duration: (steps.length + 1) * beat, pulseSeconds: beat, steps };
}
