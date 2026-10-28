import { createRng, type Rng } from "../music/random";
import { STEPS } from "../music/score/spell";
import type { Step } from "../music/score/types";
import { DRILL_LENGTH } from "./rules";
import { IQAAT } from "../music/rhythm/data/iqaat";
import { arabicNoteName, parsePitch, SOLFEGE_AR } from "./notation";
import { cycleOf, type Cycle } from "./rhythm";
import type { DrillKind } from "./types";

/**
 * Practice questions for the reading and rhythm courses, generated from a seed
 * so one attempt is reproducible. Notations use the format of notation.ts,
 * cycles the dum/tak skeletons of the rhythm engine.
 */
export type DrillOption = { label: string; notation?: string };
export type DrillQuestion = {
  prompt: string;
  /** Staff shown with the question. */
  notation?: string;
  /** Played when the question appears (ear drill); the learner may replay it. */
  listen?: string;
  options: DrillOption[];
  answer: number;
  /** Played once the question is answered, so the eye and the ear learn together. */
  hear?: string;
  /** Iqaʿ grid shown with the question ("?" marks a hidden pulse). */
  grid?: Cycle;
  /** Cycle played when the question appears / after answering. */
  listenCycle?: Cycle;
  hearCycle?: Cycle;
};

const PROMPTS = {
  name: "ما اسم هذه النوتة؟",
  value: "كم نبضة تدوم كل نوتة في هذا المقياس؟",
  rest: "كم نبضة يدوم الصمت في هذا المقياس؟",
  beats: "كم نبضة في كل مقياس؟",
  bars: "كم مقياسًا في هذا السطر؟",
  first: "كم نبضة تدوم النوتة الأولى (مع نقطتها أو ربطها)؟",
  accidental: "ما اسم هذه النوتة مع علامتها؟",
  ear: "استمع إلى اللحن، ثم اختر النوتة التي سمعتها.",
};

const BEATS: Record<number, string> = {
  4: "٤ نبضات", 3: "٣ نبضات", 2.5: "نبضتان ونصف", 2: "نبضتان", 1.5: "نبضة ونصف", 1: "نبضة واحدة", 0.5: "نصف نبضة", 0.25: "ربع نبضة",
};
const COUNT = ["٠", "١", "٢", "٣", "٤", "٥", "٦"];

const NOTE_POOLS: Partial<Record<DrillKind, string[]>> = {
  lineNotes: ["E4", "G4", "B4", "D5", "F5"],
  spaceNotes: ["F4", "A4", "C5", "E5"],
  staffNotes: ["D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5"],
  ledgerNotes: ["A3", "B3", "C4", "D4", "G5", "A5", "B5", "C6"],
};
const NAME_OPTIONS: DrillOption[] = STEPS.map((s) => ({ label: SOLFEGE_AR[s] }));

const pick = <T>(rng: Rng, list: readonly T[]) => list[rng.int(0, list.length - 1)];
function shuffle<T>(rng: Rng, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Options for a number of beats: the answer plus distractors, in increasing order. */
function beatOptions(rng: Rng, answer: number, pool: number[], n = 4) {
  const others = shuffle(rng, pool.filter((v) => v !== answer)).slice(0, n - 1);
  const values = [answer, ...others].sort((a, b) => a - b);
  return { options: values.map((v) => ({ label: BEATS[v] })), answer: values.indexOf(answer) };
}

function noteName(rng: Rng, pool: string[], last: string | null): DrillQuestion & { key: string } {
  let note = pick(rng, pool);
  while (note === last && pool.length > 1) note = pick(rng, pool);
  const p = parsePitch(note)!;
  const notation = `4/4 | ${note}:w`;
  return { key: note, prompt: PROMPTS.name, notation, options: NAME_OPTIONS, answer: STEPS.indexOf(p.step), hear: notation };
}

function noteValue(rng: Rng): DrillQuestion & { key: string } {
  const value = pick(rng, [4, 2, 1, 0.5, 0.25]);
  const note = pick(rng, ["G4", "A4", "B4", "C5", "D5"]);
  const code = { 4: "w", 2: "h", 1: "q", 0.5: "e", 0.25: "s" }[value]!;
  const beats = value === 0.25 ? 2 : 4;
  const notation = `${beats}/4 | ${Array.from({ length: beats / value }, () => `${note}:${code}`).join(" ")}`;
  return { key: String(value), prompt: PROMPTS.value, notation, ...beatOptions(rng, value, [4, 2, 1, 0.5, 0.25], 5), hear: notation };
}

const REST_BARS: [string, number][] = [
  ["C5:h r:h", 2], ["r:w", 4], ["C5:q r:q C5:h", 1], ["C5:q C5:q C5:q C5:e r:e", 0.5],
  ["r:h C5:h", 2], ["C5:h C5:q r:q", 1], ["C5:e r:e C5:q C5:h", 0.5], ["r:q C5:q C5:h", 1],
];
function rest(rng: Rng): DrillQuestion & { key: string } {
  const [bar, value] = pick(rng, REST_BARS);
  const notation = `4/4 | ${bar.replaceAll("C5", pick(rng, ["A4", "B4", "C5"]))}`;
  return { key: bar, prompt: PROMPTS.rest, notation, ...beatOptions(rng, value, [4, 2, 1, 0.5]) };
}

/** One bar of `beats` quarter beats, made of halves, quarters and pairs of eighths. */
function fillBar(rng: Rng, beats: number) {
  const out: string[] = [];
  const notes = ["E4", "F4", "G4", "A4", "B4", "C5", "D5"];
  for (let left = beats; left > 0; ) {
    const kind = left >= 2 ? rng.int(0, 2) : rng.int(1, 2);
    if (kind === 0) { out.push(`${pick(rng, notes)}:h`); left -= 2; }
    else if (kind === 1) { out.push(`${pick(rng, notes)}:q`); left -= 1; }
    else { out.push(`${pick(rng, notes)}:e`, `${pick(rng, notes)}:e`); left -= 1; }
  }
  return out.join(" ");
}
function meter(rng: Rng): DrillQuestion & { key: string } {
  const beats = pick(rng, [2, 3, 4]);
  const bars = rng.int(2, 4);
  const notation = `${beats}/4 | ${Array.from({ length: bars }, () => fillBar(rng, beats)).join(" | ")}`;
  const askBeats = rng.next() < 0.5;
  const answerValue = askBeats ? beats : bars;
  const pool = askBeats ? [2, 3, 4, 6] : [1, 2, 3, 4, 5];
  const values = [answerValue, ...shuffle(rng, pool.filter((v) => v !== answerValue)).slice(0, 3)].sort((a, b) => a - b);
  return {
    key: `${askBeats}-${beats}-${bars}`,
    prompt: askBeats ? PROMPTS.beats : PROMPTS.bars,
    notation,
    options: values.map((v) => ({ label: COUNT[v] })),
    answer: values.indexOf(answerValue),
    hear: notation,
  };
}

const LONG_NOTES: [string, number][] = [
  ["4/4 | X:h. X:q", 3], ["4/4 | X:q. X:e X:h", 1.5], ["4/4 | X:h~ X:q X:q", 3], ["4/4 | X:q~ X:q X:h", 2],
  ["4/4 | X:h~ X:h", 4], ["3/4 | X:h. | X:q X:q X:q", 3], ["4/4 | X:q~ X:e X:e X:h", 1.5], ["4/4 | X:h~ X:e X:e X:q", 2.5],
];
function dotsTies(rng: Rng): DrillQuestion & { key: string } {
  const [pattern, value] = pick(rng, LONG_NOTES);
  const notation = pattern.replaceAll("X", pick(rng, ["G4", "A4", "B4", "C5"]));
  return { key: pattern, prompt: PROMPTS.first, notation, ...beatOptions(rng, value, [1, 1.5, 2, 2.5, 3, 4]), hear: notation };
}

const ACCIDENTALS = ["F#4", "C#5", "G#4", "Bb4", "Eb4", "Ab4", "Ed4", "Bd4", "Ed5", "Bd3"];
function accidental(rng: Rng): DrillQuestion & { key: string } {
  const note = pick(rng, ACCIDENTALS);
  const p = parsePitch(note)!;
  // Distractors: the same step with the other signs, so the sign is what is read.
  const alters = [0, 1, -1, -0.5];
  const options = alters.map((alter) => ({ label: arabicNoteName({ step: p.step, alter }) }));
  const notation = `4/4 | ${note}:w`;
  return { key: note, prompt: PROMPTS.accidental, notation, options, answer: alters.indexOf(p.alter), hear: notation };
}

const EAR_NOTES: Step[] = ["C", "D", "E", "F", "G", "A", "B"];
function ear(rng: Rng): DrillQuestion & { key: string } {
  const degree = () => rng.int(0, 7);
  const toNote = (d: number) => (d === 7 ? "C5" : `${EAR_NOTES[d]}4`);
  const melody = [degree(), degree(), degree()];
  const write = (m: number[]) => `4/4 | ${toNote(m[0])}:q ${toNote(m[1])}:q ${toNote(m[2])}:h`;
  const variants = new Set([write(melody)]);
  // Distractors move one note by a step or two, so the ear must follow the line.
  while (variants.size < 3) {
    const m = [...melody];
    const i = rng.int(0, 2);
    m[i] = Math.max(0, Math.min(7, m[i] + pick(rng, [-2, -1, 1, 2])));
    variants.add(write(m));
  }
  const options = shuffle(rng, [...variants]);
  const correct = write(melody);
  return { key: correct, prompt: PROMPTS.ear, listen: correct, options: options.map((n, i) => ({ label: `${COUNT[i + 1]}`, notation: n })), answer: options.indexOf(correct) };
}

const STROKES = [
  { code: "D", label: "دُم" },
  { code: "T", label: "تَك" },
  { code: "K", label: "كا" },
];
// Wahda and malfuf share one skeleton (only speed and grouping differ), so naming drills leave malfuf out.
const NAMED = IQAAT.filter((i) => i.id !== "malfuf");
const iqaName = (id: string) => IQAAT.find((i) => i.id === id)!.names.ar;
const STROKE_LABEL: Record<string, string> = { D: "دُم", T: "تَك", K: "كا", ".": "صمت" };

function strokeEar(rng: Rng): DrillQuestion & { key: string } {
  const answer = rng.int(0, 2);
  return { key: STROKES[answer].code, prompt: "استمع: أيّ ضربة هذه؟", listenCycle: { skeleton: STROKES[answer].code, pulseUnit: 4 }, options: STROKES.map((s) => ({ label: s.label })), answer };
}

function countPulses(rng: Rng): DrillQuestion & { key: string } {
  const iqa = pick(rng, IQAAT);
  const cycle = cycleOf(iqa);
  const cells = cycle.skeleton.split(" ");
  const ask = pick(rng, ["pulses", "D", "T"] as const);
  const value = ask === "pulses" ? cells.length : cells.filter((c) => c === ask).length;
  const pool = ask === "pulses" ? [6, 8, 10, 12] : [1, 2, 3, 4];
  const values = [...new Set([value, ...shuffle(rng, pool.filter((v) => v !== value)).slice(0, 3)])].sort((a, b) => a - b);
  const prompt = ask === "pulses" ? "كم نبضة في هذه الدورة؟" : ask === "D" ? "كم ضربة «دُم» في هذه الدورة؟" : "كم ضربة «تَك» في هذه الدورة؟";
  return { key: `${iqa.id}-${ask}`, prompt: `${iqaName(iqa.id)} — ${prompt}`, grid: cycle, options: values.map((v) => ({ label: COUNT[v] ?? String(v) })), answer: values.indexOf(value), hearCycle: cycle };
}

function completeCycle(rng: Rng): DrillQuestion & { key: string } {
  const iqa = pick(rng, IQAAT);
  const cycle = cycleOf(iqa);
  const cells = cycle.skeleton.split(" ");
  // Hide a stroke more often than a silence: strokes are what the ear remembers.
  const strokes = cells.map((c, i) => (c !== "." ? i : -1)).filter((i) => i >= 0);
  const i = rng.next() < 0.75 ? pick(rng, strokes) : rng.int(0, cells.length - 1);
  const answerCode = cells[i];
  const hidden = cells.map((c, j) => (j === i ? "?" : c)).join(" ");
  const codes = ["D", "T", "."];
  return {
    key: `${iqa.id}-${i}`,
    prompt: `هذا إيقاع ${iqaName(iqa.id)}. ما الضربة في الخانة الناقصة؟`,
    grid: { ...cycle, skeleton: hidden },
    options: codes.map((c) => ({ label: STROKE_LABEL[c] })),
    answer: codes.indexOf(answerCode),
    hearCycle: cycle,
  };
}

function nameOptions(rng: Rng, id: string) {
  const others = shuffle(rng, NAMED.filter((i) => i.id !== id)).slice(0, 3).map((i) => i.id);
  const ids = shuffle(rng, [id, ...others]);
  return { options: ids.map((x) => ({ label: iqaName(x) })), answer: ids.indexOf(id) };
}

function nameIqa(rng: Rng): DrillQuestion & { key: string } {
  const iqa = pick(rng, NAMED);
  return { key: iqa.id, prompt: "ما اسم هذا الإيقاع؟", grid: cycleOf(iqa), ...nameOptions(rng, iqa.id), hearCycle: cycleOf(iqa) };
}

function iqaEar(rng: Rng): DrillQuestion & { key: string } {
  const iqa = pick(rng, NAMED);
  return { key: iqa.id, prompt: "استمع: ما اسم هذا الإيقاع؟", listenCycle: cycleOf(iqa), ...nameOptions(rng, iqa.id) };
}

/** The ten questions of one attempt; no question repeats the one just before it. */
export function makeDrill(kind: DrillKind, seed: number, length = DRILL_LENGTH): DrillQuestion[] {
  const rng = createRng(seed);
  const out: DrillQuestion[] = [];
  let last: string | null = null;
  for (let tries = 0; out.length < length && tries < length * 20; tries++) {
    const pool = NOTE_POOLS[kind];
    const q: DrillQuestion & { key: string } =
      pool ? noteName(rng, pool, last)
      : kind === "noteValues" ? noteValue(rng)
      : kind === "rests" ? rest(rng)
      : kind === "meter" ? meter(rng)
      : kind === "dotsTies" ? dotsTies(rng)
      : kind === "accidentals" ? accidental(rng)
      : kind === "strokesEar" ? strokeEar(rng)
      : kind === "countPulses" ? countPulses(rng)
      : kind === "completeCycle" ? completeCycle(rng)
      : kind === "nameIqa" ? nameIqa(rng)
      : kind === "iqaEar" ? iqaEar(rng)
      : ear(rng);
    if (q.key === last) continue;
    last = q.key;
    out.push({ ...q, key: undefined } as DrillQuestion);
  }
  return out;
}
