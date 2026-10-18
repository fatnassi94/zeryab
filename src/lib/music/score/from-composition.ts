import { getIqa } from "../composer/generate";
import type { Composition } from "../composer/types";
import { resolvePitch, tonesOf, type Direction } from "../maqam/engine";
import type { MaqamVariant } from "../maqam/types";
import { getMaqam } from "../maqam/engine";
import { TONES, type Tone } from "../notes";
import { notate, type BarFrame, type TimedEvent } from "./notate";
import { pitchCents } from "./spell";
import { TPQ, type Score, type ScorePitch } from "./types";

const ALTER: Record<Tone["accidental"], number> = { "": 0, "♭": -1, "♯": 1, "½♭": -0.5, "½♯": 0.5 };

/**
 * Written pitch of a maqam degree: the tone's own spelling (so Hijaz's F♯ and
 * Saba's G♭ stay distinct) in the octave given by its theoretical pitch.
 */
export function spellDegree(variant: MaqamVariant, degree: number, direction: Direction): ScorePitch {
  const tones = tonesOf(variant, direction);
  const steps = variant.octaveRepeating ? tones.length - 1 : tones.length;
  const tone: Tone = TONES[tones[((degree % steps) + steps) % steps]];
  const cents = resolvePitch(variant, degree, { direction }).cents;
  const alter = ALTER[tone.accidental];
  const octave = Math.round((cents - pitchCents(tone.letter, alter, 0)) / 1200);
  return { step: tone.letter, alter, octave, cents };
}

/** Generated melody → score: one bar per iqaʿ cycle, notes keep their composition ids. */
export function compositionToScore(c: Composition): Score {
  const variant = getMaqam(c.maqamId);
  const iqa = getIqa(c.iqaId);
  const pulse = (4 * TPQ) / iqa.pulseUnit;
  const [beats, beatType] = iqa.meter.split("/").map(Number);
  const time = { beats, beatType, ...(iqa.grouping ? { grouping: iqa.grouping.map((g) => g * pulse) } : {}) };
  const frames: BarFrame[] = Array.from({ length: c.cycles }, () => ({ length: iqa.pulses * pulse, time, clef: "treble" }));
  const events: TimedEvent[] = c.notes.map((n) => ({
    start: n.startPulse * pulse,
    end: (n.startPulse + n.durationPulses) * pulse,
    pitch: spellDegree(variant, n.degree, n.direction),
    sourceId: n.id,
    velocity: n.velocity,
  }));
  return { tempo: c.quarterBpm, measures: notate(events, frames), source: "composition" };
}
