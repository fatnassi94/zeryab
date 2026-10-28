/** Lesson content written in code: rich blocks the lesson page renders (text supports **bold**). */
export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "list"; items: string[] }
  | { t: "tip"; text: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "metronome"; bpm?: number; beats?: number; text?: string }
  /** A staff example (see notation.ts) that can be played, with or without the metronome. */
  | { t: "staff"; notation: string; caption?: string; names?: boolean; toggleNames?: boolean; tempo?: number; /** Iqaʿ played under the melody. */ iqa?: string }
  /** An iqaʿ cycle: its pulses, dum and tak, played in a loop with the current pulse lit. */
  | { t: "iqa"; iqa: string; caption?: string; tempo?: number }
  /** The three strokes (dum, tak, ka) to hear one by one. */
  | { t: "strokes" }
  | { t: "practice"; steps: string[]; notation?: string; caption?: string; tempo?: number };

export type DrillKind =
  | "lineNotes" | "spaceNotes" | "staffNotes" | "ledgerNotes" | "noteValues"
  | "rests" | "meter" | "dotsTies" | "accidentals" | "ear"
  | "strokesEar" | "countPulses" | "completeCycle" | "nameIqa" | "iqaEar"
  /** Tap the strokes of `iqa` in time (scored on timing, not a question set). */
  | "tap";

export type CourseItem = { slug: string; title: string; summary: string } & (
  | { kind: "lesson"; minutes: number; blocks: Block[] }
  | { kind: "drill"; drill: DrillKind; iqa?: string }
  | { kind: "test" }
);

export type Course = { slug: string; title: string; items: CourseItem[] };
