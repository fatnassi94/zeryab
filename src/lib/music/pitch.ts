/**
 * Pitch math. Every pitch is an exact number of cents until the very last step
 * that needs something else (MIDI note + detune, pitch bend). Nothing here
 * rounds to 12-tone equal temperament.
 *
 * Absolute pitch = cents above C0. C4 = 4800, A4 = 5700.
 */

export type Cents = number;
export type Pitch = { cents: Cents };

export const C4: Cents = 4800;
const A4_CENTS: Cents = 5700;
/** MIDI note number of C0 (MIDI 60 = C4). */
const MIDI_C0 = 12;

export function hz(pitch: Pitch, a4 = 440): number {
  return a4 * 2 ** ((pitch.cents - A4_CENTS) / 1200);
}

export function fromHz(frequency: number, a4 = 440): Pitch {
  if (!(frequency > 0)) throw new RangeError(`Frequency must be positive, got ${frequency}`);
  return { cents: A4_CENTS + 1200 * Math.log2(frequency / a4) };
}

/** Interval in cents between two frequencies (positive if b is higher). */
export const centsBetween = (a: number, b: number): Cents => 1200 * Math.log2(b / a);

/** Cents of a frequency ratio, e.g. ratioToCents(3, 2) ≈ 701.955. */
export const ratioToCents = (num: number, den: number): Cents => 1200 * Math.log2(num / den);

/**
 * Nearest 12-TET MIDI note plus the remaining offset in cents (−50 < detune ≤ 50).
 * Used only at the playback/MIDI boundary; keep the detune, never drop it.
 */
export function toMidi(pitch: Pitch): { note: number; detuneCents: Cents } {
  const exact = MIDI_C0 + pitch.cents / 100;
  const note = Math.round(exact);
  return { note, detuneCents: round6((exact - note) * 100) };
}

export function fromMidi(note: number, detuneCents: Cents = 0): Pitch {
  return { cents: (note - MIDI_C0) * 100 + detuneCents };
}

/**
 * MIDI pitch-bend value in −1…1 (the normalisation used by @tonejs/midi) for a
 * detune, given the receiver's bend range. Write the range (RPN 0) into the
 * file too — never assume the receiver's default.
 */
export function pitchBendValue(detuneCents: Cents, bendRangeCents: Cents = 200): number {
  if (Math.abs(detuneCents) > bendRangeCents) {
    throw new RangeError(`Detune ${detuneCents}¢ exceeds bend range ±${bendRangeCents}¢`);
  }
  return detuneCents / bendRangeCents;
}

/** Reduce to one octave: 0 ≤ result < 1200. */
export const pitchClass = (cents: Cents): Cents => round6(((cents % 1200) + 1200) % 1200);

/** Avoid float noise like 349.99999999 in tables and snapshots. */
export const round6 = (x: number) => Math.round(x * 1e6) / 1e6;
