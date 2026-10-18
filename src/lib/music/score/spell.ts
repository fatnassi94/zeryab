import { round6, type Cents } from "../pitch";
import type { GlyphName } from "./glyphs";
import type { Clef, ScorePitch, Step } from "./types";

export const STEPS: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
const STEP_CENTS: Record<Step, Cents> = { C: 0, D: 200, E: 400, F: 500, G: 700, A: 900, B: 1100 };

/** Written pitch → cents (C0 = 0, C4 = 4800), alterations exact (−0.5 = 50 cents down). */
export const pitchCents = (step: Step, alter: number, octave: number): Cents => round6(octave * 1200 + STEP_CENTS[step] + alter * 100);

export const writtenPitch = (step: Step, alter: number, octave: number): ScorePitch => ({ step, alter, octave, cents: pitchCents(step, alter, octave) });

/**
 * Spelling for a pitch that arrives without one (MIDI). Rounds to the nearest
 * quarter-tone and prefers the spellings of Arab practice: E♭ (Kurd), E½♭
 * (Sikah), F♯ (Hijaz), A♭ (Hisar), B♭ (ʿAjam), B½♭ (Awj). `prefer` follows a
 * flat or sharp key signature for the black keys.
 */
export function spellCents(cents: Cents, prefer: "flat" | "sharp" = "flat"): { step: Step; alter: number; octave: number } {
  const q = Math.round(cents / 50) * 50;
  const octave = Math.floor(q / 1200);
  const pc = q - octave * 1200;
  const table: Record<number, [Step, number]> = {
    0: ["C", 0], 50: ["C", 0.5], 100: prefer === "sharp" ? ["C", 1] : ["D", -1], 150: ["D", -0.5],
    200: ["D", 0], 250: ["D", 0.5], 300: prefer === "sharp" ? ["D", 1] : ["E", -1], 350: ["E", -0.5],
    400: ["E", 0], 450: ["E", 0.5], 500: ["F", 0], 550: ["F", 0.5],
    600: prefer === "flat" ? ["G", -1] : ["F", 1], 650: ["G", -0.5], 700: ["G", 0], 750: ["G", 0.5],
    800: prefer === "sharp" ? ["G", 1] : ["A", -1], 850: ["A", -0.5], 900: ["A", 0], 950: ["A", 0.5],
    1000: prefer === "sharp" ? ["A", 1] : ["B", -1], 1050: ["B", -0.5], 1100: ["B", 0], 1150: ["B", 0.5],
  };
  // Hijaz (F♯) is far more common than Saba's G♭ when nothing says otherwise.
  const [step, alter] = pc === 600 && prefer === "flat" ? (["F", 1] as [Step, number]) : table[pc];
  return { step, alter, octave };
}

/** Diatonic index (C0 = 0, D0 = 1 … C4 = 28). */
export const diatonic = (p: Pick<ScorePitch, "step" | "octave">) => p.octave * 7 + STEPS.indexOf(p.step);

/** Diatonic index of each clef's bottom line: E4, E3 (octave-down treble, as for oud), G2. */
const BOTTOM_LINE: Record<Clef, number> = { treble: 30, treble8vb: 23, bass: 18 };

/** Staff position: 0 = bottom line, 4 = middle line, 8 = top line; odd = spaces. */
export const staffPosition = (p: Pick<ScorePitch, "step" | "octave">, clef: Clef) => diatonic(p) - BOTTOM_LINE[clef];

const ACCIDENTAL_GLYPHS: Record<string, GlyphName> = {
  "-2": "accidentalDoubleFlatArabic",
  "-1.5": "accidentalThreeQuarterTonesFlatArabic",
  "-1": "accidentalFlatArabic",
  "-0.5": "accidentalQuarterToneFlatArabic",
  "0": "accidentalNaturalArabic",
  "0.5": "accidentalQuarterToneSharpArabic",
  "1": "accidentalSharpArabic",
  "1.5": "accidentalThreeQuarterTonesSharpArabic",
  "2": "accidentalDoubleSharpArabic",
};

/** Arabic-style accidental for an alteration (nearest quarter-tone). */
export const accidentalGlyph = (alter: number): GlyphName | undefined => ACCIDENTAL_GLYPHS[String(Math.round(alter * 2) / 2)];

/** Clef that keeps most notes on the staff (for imports without a usable clef). */
export function clefForRange(pitches: Pick<ScorePitch, "step" | "octave">[]): Clef {
  if (!pitches.length) return "treble";
  const sorted = pitches.map(diatonic).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median < 26 ? "bass" : "treble"; // below A3
}
