import type { Cents } from "../pitch";

/**
 * Engraving model: what a score shows (measures, note values, ties, written
 * pitches). It is shared by generated melodies and imported files, and is
 * independent of the renderer and of audio.
 *
 * Time is in integer ticks: TPQ per quarter note. 960 divides evenly by 2, 3,
 * 4, 5, 6, 8, 10, 12, 15 and 16, so tuplets and file divisions stay exact.
 */
export const TPQ = 960;

export type Step = "C" | "D" | "E" | "F" | "G" | "A" | "B";

/**
 * Written pitch. `alter` is in semitones and may be fractional (−0.5 = half
 * flat, as in Sikah); `cents` is the exact sounding pitch (C0 = 0, C4 = 4800).
 */
export type ScorePitch = { step: Step; alter: number; octave: number; cents: Cents };

export type NoteType = "whole" | "half" | "quarter" | "eighth" | "16th" | "32nd" | "64th";

export type Tuplet = { actual: number; normal: number; /** Notes of one bracket share a group id. */ group: string };

export type ScoreNote = {
  id: string;
  /** Pieces that sound as one note (tied pieces, the composition note they came from) share a sourceId. */
  sourceId: string;
  /** Start inside the measure and length, in ticks. */
  offset: number;
  duration: number;
  type: NoteType;
  dots: number;
  /** Absent for rests. */
  pitch?: ScorePitch;
  tieStart?: boolean;
  tieStop?: boolean;
  tuplet?: Tuplet;
  /** Whole-bar rest, drawn centred whatever the meter. */
  measureRest?: boolean;
  lyric?: string;
  velocity?: number;
  /** Primary beam state read from a file; computed from the meter when absent. */
  beam?: "begin" | "continue" | "end";
};

export type TimeSignature = {
  beats: number;
  beatType: number;
  /** Additive grouping as tick lengths, e.g. 3+2+2+3 eighths for samaʿi thaqil. */
  grouping?: number[];
  symbol?: "common" | "cut";
};

export type Clef = "treble" | "treble8vb" | "bass";

export type Measure = {
  number: string;
  /** Length in ticks; a pickup bar is shorter than its time signature. */
  length: number;
  /** Effective time signature and clef (the layout decides when to print them). */
  time: TimeSignature;
  clef: Clef;
  notes: ScoreNote[];
  repeatStart?: boolean;
  /** Backward repeat at the end of this bar: total number of plays (2 = once more). */
  repeatEnd?: number;
  /** Volta bracket: which passes play this bar, and whether the bracket starts/ends here. */
  ending?: { numbers: number[]; start: boolean; stop: boolean; open?: boolean };
  barline?: "double" | "final";
  /** Text printed above the bar: a section ("الخانة الأولى", "التسليم") or a modulation ("راست نوا"). */
  label?: string;
  /** Tempo changes inside the bar (quarter notes per minute). */
  tempos?: { offset: number; bpm: number }[];
};

export type Score = {
  title?: string;
  composer?: string;
  /** Initial tempo in quarter notes per minute. */
  tempo: number;
  measures: Measure[];
  source: "composition" | "musicxml" | "midi" | "ai";
};

export const measureTicks = (t: Pick<TimeSignature, "beats" | "beatType">) => Math.round((t.beats * 4 * TPQ) / t.beatType);
