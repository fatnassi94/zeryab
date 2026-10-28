import { writtenPitch } from "../music/score/spell";
import { measureTicks, TPQ, type Measure, type NoteType, type Score, type ScoreNote, type Step, type TimeSignature } from "../music/score/types";

/**
 * Short text notation for lesson examples and drills, e.g.
 * `"4/4 | C4:q D4:q E4:h | G4:w"`.
 *
 * - Bars are separated by `|`; the first token may be a time signature.
 * - Pitch: step + accidental + octave. `#` sharp, `b` flat, `d` half flat
 *   (Arabic "نصف بيمول", as Mi in Rast), `n` natural. `r` is a rest.
 * - Value after `:`: w half(h) q e s, `.` adds a dot, `~` ties to the next note.
 */

const VALUES: Record<string, { type: NoteType; ticks: number }> = {
  w: { type: "whole", ticks: 4 * TPQ },
  h: { type: "half", ticks: 2 * TPQ },
  q: { type: "quarter", ticks: TPQ },
  e: { type: "eighth", ticks: TPQ / 2 },
  s: { type: "16th", ticks: TPQ / 4 },
};
const ALTER: Record<string, number> = { "": 0, n: 0, "#": 1, b: -1, d: -0.5 };
const TOKEN = /^(r|([A-G])([#bdn]?)(\d))(?::([whqes])(\.?)(~?))?$/;

export type ParsedNote = { step: Step; alter: number; octave: number } | null;

/** Pitch of one token (`null` for a rest); throws on anything else. */
export function parsePitch(token: string): ParsedNote {
  const m = TOKEN.exec(token.trim());
  if (!m) throw new Error(`Bad note "${token}"`);
  if (m[1] === "r") return null;
  return { step: m[2] as Step, alter: ALTER[m[3]], octave: Number(m[4]) };
}

/** Score for a notation string. Notes without a value last one beat (a quarter). */
export function parseNotation(text: string, opts: { tempo?: number; title?: string } = {}): Score {
  const bars = text.split("|").map((b) => b.trim().split(/\s+/).filter(Boolean));
  let time: TimeSignature = { beats: 4, beatType: 4 };
  const sig = /^(\d+)\/(\d+)$/.exec(bars[0]?.[0] ?? "");
  if (sig) {
    time = { beats: Number(sig[1]), beatType: Number(sig[2]) };
    bars[0].shift();
    if (!bars[0].length) bars.shift();
  }
  const length = measureTicks(time);
  let id = 0;
  let tiedFrom: string | null = null;
  const measures: Measure[] = bars.map((tokens, b) => {
    let offset = 0;
    const notes: ScoreNote[] = tokens.map((token) => {
      const m = TOKEN.exec(token);
      if (!m) throw new Error(`Bad note "${token}"`);
      const value = VALUES[m[5] ?? "q"];
      const dots = m[6] ? 1 : 0;
      const duration = value.ticks * (dots ? 1.5 : 1);
      const rest = m[1] === "r";
      const noteId = `n${id++}`;
      const note: ScoreNote = { id: noteId, sourceId: tiedFrom ?? noteId, offset, duration, type: value.type, dots };
      if (!rest) note.pitch = writtenPitch(m[2] as Step, ALTER[m[3]], Number(m[4]));
      if (tiedFrom && !rest) note.tieStop = true;
      tiedFrom = null;
      if (m[7] && !rest) {
        note.tieStart = true;
        tiedFrom = note.sourceId;
      }
      if (rest && duration === length && tokens.length === 1) note.measureRest = true;
      offset += duration;
      return note;
    });
    if (offset > length) throw new Error(`Bar ${b + 1} is too long`);
    return { number: String(b + 1), length, time, clef: "treble", notes };
  });
  if (measures.length) measures[measures.length - 1].barline = "final";
  return { title: opts.title, tempo: opts.tempo ?? 80, measures, source: "composition" };
}

/** Arabic solfège names, as taught in Tunisia (دو ري مي…). */
export const SOLFEGE_AR: Record<Step, string> = { C: "دو", D: "ري", E: "مي", F: "فا", G: "صول", A: "لا", B: "سي" };
const ACCIDENTAL_AR: Record<string, string> = { "0": "", "1": " دييز", "-1": " بيمول", "-0.5": " نصف بيمول" };

/** "مي نصف بيمول" for Ed4. */
export const arabicNoteName = (p: { step: Step; alter: number }) => SOLFEGE_AR[p.step] + (ACCIDENTAL_AR[String(p.alter)] ?? "");
