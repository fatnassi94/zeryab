import { valueTicks } from "./notate";
import { writtenPitch } from "./spell";
import { TPQ, measureTicks, type Clef, type Measure, type NoteType, type Score, type ScoreNote, type Step, type TimeSignature } from "./types";

/**
 * Sheet music image/PDF → structured transcription (by Claude) → Score.
 * This file holds the parts that need no network: the JSON schema Claude's
 * answer is constrained to, the instructions, and the conversion to a Score.
 * The API call itself is server-only (src/lib/ai/transcribe.ts).
 */

const DURATIONS = ["whole", "half", "quarter", "eighth", "16th", "32nd"] as const;
const ALTERS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2] as const;
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });

/** JSON schema for structured outputs (every object closed, every property required). */
export const TRANSCRIPTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "title", "composer", "tempo", "clef", "measures", "warnings"],
  properties: {
    readable: { type: "boolean", description: "False when the input is not sheet music or is too unclear to transcribe." },
    title: { ...nullable({ type: "string" }), description: "Title as printed, in its original script, or null." },
    composer: { ...nullable({ type: "string" }), description: "Composer as printed, or null." },
    tempo: { ...nullable({ type: "number" }), description: "Quarter notes per minute when a metronome mark is printed, else null." },
    clef: { type: "string", enum: ["treble", "bass"] },
    measures: {
      type: "array",
      description: "Every bar of the melody line, in order, across all systems and pages.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["time", "repeatStart", "repeatEnd", "endings", "notes"],
        properties: {
          time: {
            ...nullable({
              type: "object",
              additionalProperties: false,
              required: ["beats", "beatType"],
              properties: { beats: { type: "integer" }, beatType: { type: "integer" } },
            }),
            description: "Time signature printed at this bar (always given on the first bar), else null.",
          },
          repeatStart: { type: "boolean", description: "Forward repeat sign at the start of the bar." },
          repeatEnd: { type: "boolean", description: "Backward repeat sign at the end of the bar." },
          endings: { type: "array", items: { type: "integer" }, description: "Volta (numbered ending) numbers over this bar, e.g. [1]; empty if none." },
          notes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["rest", "step", "alter", "octave", "duration", "dots", "triplet", "tie", "lyric"],
              properties: {
                rest: { type: "boolean" },
                step: nullable({ type: "string", enum: ["C", "D", "E", "F", "G", "A", "B"] }),
                alter: {
                  type: "number",
                  enum: [...ALTERS],
                  description: "Sounding alteration in semitones after the key signature and earlier accidentals in the bar: -0.5 half-flat, 0.5 half-sharp, -1 flat, 1 sharp.",
                },
                octave: { ...nullable({ type: "integer" }), description: "Scientific octave: middle C is C4." },
                duration: { type: "string", enum: [...DURATIONS] },
                dots: { type: "integer", enum: [0, 1, 2] },
                triplet: { type: "boolean", description: "Part of a triplet." },
                tie: { type: "boolean", description: "Tied to the next note." },
                lyric: { ...nullable({ type: "string" }), description: "Lyric syllable printed under this note, or null." },
              },
            },
          },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" }, description: "Short notes on unclear bars or symbols, naming the bar number." },
  },
} as const;

/** List prices of claude-opus-5-5 in USD per million tokens (for the estimate shown after a run). */
const PRICE_PER_MTOK = { input: 4, output: 20 };
export const estimateCostUsd = (usage: { input: number; output: number }) =>
  Math.round(((usage.input * PRICE_PER_MTOK.input + usage.output * PRICE_PER_MTOK.output) / 1e6) * 100) / 100;

export const TRANSCRIPTION_SYSTEM = `You transcribe sheet music for the Maqam lab of an Arabic music academy. Your transcription is shown as a score with the name under each note and played with exact quarter-tones, so every pitch and duration matters.

Transcribe the melody line: the top staff of the first part (for chords, the highest note). Go bar by bar across every system and page, exactly as written, without simplifying or completing anything. Include rests, dots, triplets, ties, repeat signs, numbered endings, the time signature at the start and wherever it changes, and the lyric syllable under each note when lyrics are printed. Keep titles and lyrics in their original script.

Arabic accidentals: a flat with a slash through its stem (or a reversed flat) is a half-flat, alter -0.5; a sharp with a single vertical stroke (or a slashed sharp) is a half-sharp, alter 0.5. Key signatures may contain half-flats (Rast is often written with E and B half-flat). The alter you give is the sounding alteration of each note: apply the key signature, accidentals that carry to the end of the bar, and naturals.

Octaves use scientific pitch (middle C is C4): the bottom line of the treble clef is E4, of the bass clef G2. A first bar shorter than the time signature is a pickup; transcribe it as written.

If a symbol is unclear, give your best reading and add a warning naming the bar. If the input is not sheet music or cannot be read, set readable to false and say why in warnings.`;

export type TranscribedNote = {
  rest: boolean;
  step: Step | null;
  alter: number;
  octave: number | null;
  duration: (typeof DURATIONS)[number];
  dots: number;
  triplet: boolean;
  tie: boolean;
  lyric: string | null;
};
export type TranscribedMeasure = { time: { beats: number; beatType: number } | null; repeatStart: boolean; repeatEnd: boolean; endings: number[]; notes: TranscribedNote[] };
export type Transcription = {
  readable: boolean;
  title: string | null;
  composer: string | null;
  tempo: number | null;
  clef: "treble" | "bass";
  measures: TranscribedMeasure[];
  warnings: string[];
};

/** Parse Claude's JSON answer, checking the fields the conversion relies on. */
export function parseTranscription(text: string): Transcription {
  const t = JSON.parse(text) as Transcription;
  const ok =
    typeof t === "object" && t !== null && typeof t.readable === "boolean" && Array.isArray(t.measures) && Array.isArray(t.warnings) &&
    t.measures.every((m) => Array.isArray(m?.notes) && Array.isArray(m.endings) && m.notes.every((n) => typeof n?.rest === "boolean" && (DURATIONS as readonly string[]).includes(n.duration)));
  if (!ok) throw new Error("Unexpected transcription shape");
  return t;
}

const STEPS = new Set(["C", "D", "E", "F", "G", "A", "B"]);
const BEAT_TYPES = new Set([1, 2, 4, 8, 16, 32]);
const sameList = (a: number[] = [], b: number[] = []) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Transcription → Score: offsets from the note values, ties linked, triplets bracketed, voltas spanned. */
export function transcriptionToScore(t: Transcription): Score {
  let time: TimeSignature = { beats: 4, beatType: 4 };
  const clef: Clef = t.clef === "bass" ? "bass" : "treble";
  let tuplet: { group: string; filled: number } | undefined;
  let seq = 0;

  const measures: Measure[] = t.measures.map((tm, mi) => {
    if (tm.time && tm.time.beats > 0 && BEAT_TYPES.has(tm.time.beatType)) time = { beats: tm.time.beats, beatType: tm.time.beatType };
    let offset = 0;
    const notes: ScoreNote[] = tm.notes.map((tn, ni) => {
      const type = tn.duration as NoteType;
      const dots = Math.max(0, Math.min(2, Math.round(tn.dots)));
      const nominal = valueTicks(type, dots);
      const duration = tn.triplet ? Math.round((nominal * 2) / 3) : nominal;
      let noteTuplet: ScoreNote["tuplet"];
      if (tn.triplet) {
        tuplet ??= { group: `t${seq++}`, filled: 0 };
        noteTuplet = { actual: 3, normal: 2, group: tuplet.group };
        tuplet.filled += duration;
        if (tuplet.filled % TPQ === 0) tuplet = undefined;
      } else {
        tuplet = undefined;
      }
      const pitched = !tn.rest && tn.step !== null && STEPS.has(tn.step) && Number.isInteger(tn.octave);
      const id = `m${mi}n${ni}`;
      const note: ScoreNote = {
        id,
        sourceId: id,
        offset,
        duration,
        type,
        dots,
        ...(pitched ? { pitch: writtenPitch(tn.step!, Math.round(tn.alter * 2) / 2, tn.octave!) } : {}),
        ...(pitched && tn.tie ? { tieStart: true } : {}),
        ...(noteTuplet ? { tuplet: noteTuplet } : {}),
        ...(tn.lyric?.trim() ? { lyric: tn.lyric.trim() } : {}),
      };
      offset += duration;
      return note;
    });
    const length = offset > 0 ? offset : measureTicks(time);
    if (!notes.length) notes.push({ id: `m${mi}r`, sourceId: `m${mi}r`, offset: 0, duration: length, type: "whole", dots: 0, measureRest: true });
    return {
      number: String(mi + 1),
      length,
      time,
      clef,
      notes,
      ...(tm.repeatStart ? { repeatStart: true } : {}),
      ...(tm.repeatEnd ? { repeatEnd: 2 } : {}),
    };
  });

  // A shorter first bar is a pickup: number it 0, as printed scores do.
  if (measures.length > 1 && measures[0].length < measureTicks(measures[0].time)) measures.forEach((m, i) => (m.number = String(i)));

  // Volta brackets span consecutive bars with the same numbers; the last one stays open.
  measures.forEach((m, i) => {
    const nums = t.measures[i].endings.filter((v) => Number.isInteger(v) && v > 0);
    if (!nums.length) return;
    const start = !sameList(t.measures[i - 1]?.endings, nums);
    const stop = !sameList(t.measures[i + 1]?.endings, nums);
    m.ending = { numbers: nums, start, stop, ...(stop && !m.repeatEnd ? { open: true } : {}) };
  });

  // Ties connect to the next note of the same pitch; otherwise they are dropped.
  const flat = measures.flatMap((m) => m.notes);
  flat.forEach((n, i) => {
    if (!n.tieStart || !n.pitch) return;
    const next = flat[i + 1];
    if (next?.pitch && next.pitch.cents === n.pitch.cents) {
      next.tieStop = true;
      next.sourceId = n.sourceId;
    } else {
      delete n.tieStart;
    }
  });

  const tempo = t.tempo && t.tempo >= 20 && t.tempo <= 320 ? t.tempo : 90;
  return { title: t.title?.trim() || undefined, composer: t.composer?.trim() || undefined, tempo, measures, source: "ai" };
}

/**
 * Bars whose notes don't add up to their time signature (the first bar may be
 * a pickup, the last one may be cut short). In a transcription this usually
 * means a missed or misread note, so the lab points the reader to it.
 */
export function unevenBars(score: Score): { bar: string; written: number; expected: number }[] {
  const beat = (m: Measure) => (4 * TPQ) / m.time.beatType;
  return score.measures.flatMap((m, i) => {
    const expected = measureTicks(m.time);
    const edge = (i === 0 && m.length < expected) || (i === score.measures.length - 1 && m.length < expected);
    if (m.length === expected || edge || m.notes.every((n) => n.measureRest)) return [];
    return [{ bar: m.number, written: Math.round((m.length / beat(m)) * 100) / 100, expected: m.time.beats }];
  });
}
