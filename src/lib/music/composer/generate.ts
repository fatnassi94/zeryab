import { degreesOf, getMaqam } from "../maqam/engine";
import type { MaqamVariant } from "../maqam/types";
import { createRng, type Rng } from "../random";
import { IQAAT } from "../rhythm/data/iqaat";
import type { Iqa } from "../rhythm/types";
import type { ComposeOptions, Composition, NoteEvent, Phrase, PhraseRole } from "./types";

/**
 * Rule-based, deterministic melody generator (initial rule set, to be refined
 * with the club's teachers). It does not imitate any specific repertoire; it
 * produces practice material that stays inside the maqam:
 *  1. Every note is a degree of the chosen maqam; descending motion uses the
 *     descending form where the maqam has one.
 *  2. Phrases follow a simple arc: opening around the tonic → development
 *     toward the ghammaz → climax in the upper jins → cadence on the tonic.
 *  3. Mostly stepwise motion; leaps of a third/fourth are followed by a step
 *     back in the opposite direction.
 *  4. Notes start on the iqaʿ strokes, so melody and rhythm agree. The last
 *     three notes walk down toward the tonic, and the final cycle is a single
 *     tonic starting on the cycle's first stroke (always a dum) and held.
 */
export function compose(opts: ComposeOptions): Composition {
  const variant = getMaqam(opts.maqamId);
  const iqa = getIqa(opts.iqaId);
  const seed = (opts.seed ?? 1) >>> 0;
  const cycles = Math.max(2, Math.min(32, Math.round(opts.cycles ?? 8)));
  const rng = createRng(seed);

  const phrases = planPhrases(variant, cycles);
  const notes: NoteEvent[] = [];
  const top = degreesOf(variant).length - 1; // octave (or top of a non-octave scale)
  const onsets = iqa.events.map((e) => e.pulse);
  let current = 0;
  let pendingResolution = 0; // after a leap: the step (−1/+1) required next

  // Body: every cycle except the last follows the phrase arc on the iqaʿ strokes.
  for (const phrase of phrases) {
    if (phrase.role === "cadence") continue;
    for (let c = phrase.startCycle; c < phrase.startCycle + phrase.cycles; c++) {
      onsets.forEach((pulse, i) => {
        let degree: number;
        if (pendingResolution) {
          degree = clamp(current + pendingResolution, 0, top);
          pendingResolution = 0;
        } else {
          const move = chooseMove(rng, current, phrase.target);
          degree = clamp(current + move, 0, top);
          if (Math.abs(move) >= 2) pendingResolution = -Math.sign(move);
        }
        notes.push({
          id: `n${notes.length}`,
          startPulse: c * iqa.pulses + pulse,
          durationPulses: (onsets[i + 1] ?? iqa.pulses) - pulse,
          degree,
          direction: degree < current ? "descending" : "ascending",
          velocity: strokeVelocity(iqa, pulse, rng),
        });
        current = degree;
      });
    }
  }

  // Approach: the last three notes move evenly from where the line was toward
  // degree 1, so the cadence arrives by step (at most a third) rather than a leap.
  if (notes.length >= 4) {
    const from = notes[notes.length - 4].degree;
    notes.slice(-3).forEach((n, k) => {
      n.degree = Math.round(from + (1 - from) * ((k + 1) / 3));
    });
  }
  for (let k = 1; k < notes.length; k++) notes[k].direction = notes[k].degree < notes[k - 1].degree ? "descending" : "ascending";

  // Cadence: the final cycle is one long tonic starting on the first stroke (a dum).
  const lastCycle = cycles - 1;
  notes.push({
    id: `n${notes.length}`,
    startPulse: lastCycle * iqa.pulses + onsets[0],
    durationPulses: iqa.pulses - onsets[0],
    degree: 0,
    direction: "descending",
    velocity: 0.85,
  });

  return {
    version: 1,
    maqamId: variant.id,
    tuningId: opts.tuningId ?? "theoretical",
    iqaId: iqa.id,
    quarterBpm: opts.quarterBpm ?? defaultTempo(iqa),
    seed,
    cycles,
    notes,
    phrases,
    percussion: opts.percussion ?? true,
    drone: opts.drone ?? true,
  };
}

export function getIqa(id: string): Iqa {
  const iqa = IQAAT.find((i) => i.id === id);
  if (!iqa) throw new Error(`Unknown iqaʿ "${id}"`);
  return iqa;
}

const defaultTempo = (iqa: Iqa) => (iqa.tempoRange ? Math.round((iqa.tempoRange[0] + iqa.tempoRange[1]) / 2) : 90);

/** Split the piece into the opening → development → climax → cadence arc. */
export function planPhrases(variant: MaqamVariant, cycles: number): Phrase[] {
  const top = degreesOf(variant).length - 1;
  const roles: [PhraseRole, number][] = [
    ["opening", Math.min(2, variant.lower.degree + 2)],
    ["development", variant.ghammaz],
    ["climax", Math.min(top, variant.ghammaz + 2)],
    ["cadence", 0],
  ];
  // Cadence always gets the final cycle; the rest is shared as evenly as possible.
  const body = cycles - 1;
  const sizes = [0, 0, 0].map((_, i) => Math.floor(body / 3) + (i < body % 3 ? 1 : 0));
  const phrases: Phrase[] = [];
  let start = 0;
  roles.forEach(([role, target], i) => {
    const size = i < 3 ? sizes[i] : 1;
    if (size === 0) return;
    phrases.push({ role, startCycle: start, cycles: size, target });
    start += size;
  });
  return phrases;
}

/** Weighted step choice biased toward the phrase target. */
function chooseMove(rng: Rng, current: number, target: number): number {
  const toward = Math.sign(target - current) || (rng.next() < 0.5 ? 1 : -1);
  return rng.weighted([
    [toward, 0.46],
    [-toward, 0.2],
    [0, 0.1],
    [2 * toward, 0.12],
    [-2 * toward, 0.04],
    [3 * toward, 0.08],
  ] as const);
}

function strokeVelocity(iqa: Iqa, pulse: number, rng: Rng): number {
  const stroke = iqa.events.find((e) => e.pulse === pulse)?.stroke;
  const base = pulse === 0 ? 0.9 : stroke === "dum" ? 0.8 : 0.66;
  return Math.round((base + (rng.next() - 0.5) * 0.08) * 100) / 100;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
