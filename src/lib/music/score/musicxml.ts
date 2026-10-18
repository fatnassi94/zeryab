import { restPieces, valueOf } from "./notate";
import { clefForRange, pitchCents } from "./spell";
import { TPQ, measureTicks, type Clef, type Measure, type NoteType, type Score, type ScoreNote, type Step, type TimeSignature } from "./types";

/**
 * MusicXML (score-partwise) → Score, keeping the file's own notation (note
 * values, dots, ties, tuplets, beams, repeats, voltas, lyrics). Only one line
 * is read: the chosen part's first staff and its main voice, top note of
 * chords. Quarter-tones come from <alter> (e.g. −0.5), or from a quarter-tone
 * <accidental> when an exporter omitted the alter.
 *
 * Uses only DOM Level 2 calls so it runs on the browser's DOMParser and on
 * @xmldom/xmldom in tests.
 */

export class ScoreImportError extends Error {
  constructor(public code: "format" | "empty" | "read" | "timewise") {
    super(code);
  }
}

const kids = (el: Element, name?: string): Element[] => {
  const out: Element[] = [];
  for (let c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (!name || c.nodeName === name)) out.push(c as Element);
  return out;
};
const kid = (el: Element | undefined, name: string): Element | undefined => (el ? kids(el, name)[0] : undefined);
const text = (el: Element | undefined, name: string): string | undefined => kid(el, name)?.textContent?.trim() || undefined;
const num = (el: Element | undefined, name: string): number | undefined => {
  const t = text(el, name);
  const v = t === undefined ? NaN : Number(t);
  return Number.isFinite(v) ? v : undefined;
};
const deep = (el: Element, name: string): Element | undefined => el.getElementsByTagName(name)[0] ?? undefined;

/** Accidental names that mean a quarter-tone alteration (used only when <alter> is missing or whole). */
const QUARTER_ACCIDENTALS: Record<string, number> = {
  "quarter-flat": -0.5, "quarter-sharp": 0.5, "three-quarters-flat": -1.5, "three-quarters-sharp": 1.5,
  "slash-flat": -0.5, "slash-quarter-sharp": 0.5, "koron": -0.5, "sori": 0.5,
  accidentalQuarterToneFlatArabic: -0.5, accidentalQuarterToneSharpArabic: 0.5,
  accidentalThreeQuarterTonesFlatArabic: -1.5, accidentalThreeQuarterTonesSharpArabic: 1.5,
  accidentalQuarterToneFlatStein: -0.5, accidentalQuarterToneSharpStein: 0.5,
  accidentalThreeQuarterTonesFlatZimmermann: -1.5, accidentalThreeQuarterTonesSharpStein: 1.5,
};

const NOTE_TYPES: Record<string, NoteType> = {
  breve: "whole", whole: "whole", half: "half", quarter: "quarter", eighth: "eighth", "16th": "16th", "32nd": "32nd", "64th": "64th", "128th": "64th", "256th": "64th",
};

const ARABIC = /[؀-ۿ]/;

export type PartInfo = { id: string; name: string };

export function listParts(doc: Document): PartInfo[] {
  const root = doc.documentElement;
  const names = new Map(kids(kid(root, "part-list") ?? root, "score-part").map((p) => [p.getAttribute("id") || "", text(p, "part-name") ?? ""]));
  return kids(root, "part").map((p, i) => {
    const id = p.getAttribute("id") || String(i);
    return { id, name: names.get(id) || `${i + 1}` };
  });
}

/** Index of the first part that has pitched notes (skips percussion-only parts). */
export function defaultPart(doc: Document): number {
  const parts = kids(doc.documentElement, "part");
  const i = parts.findIndex((p) => p.getElementsByTagName("pitch").length > 0);
  return Math.max(0, i);
}

export function parseMusicXml(doc: Document, partIndex = defaultPart(doc)): Score {
  const root = doc.documentElement;
  if (!root || doc.getElementsByTagName("parsererror").length) throw new ScoreImportError("read");
  if (root.nodeName === "score-timewise") throw new ScoreImportError("timewise");
  if (root.nodeName !== "score-partwise") throw new ScoreImportError("format");
  const part = kids(root, "part")[partIndex];
  if (!part) throw new ScoreImportError("empty");

  const title = text(kid(root, "work"), "work-title") ?? text(root, "movement-title");
  const composer = kids(kid(root, "identification") ?? root, "creator").find((c) => c.getAttribute("type") === "composer")?.textContent?.trim() || undefined;

  // The line we read: first staff, and its busiest voice.
  const counts = new Map<string, number>();
  for (const n of Array.from(part.getElementsByTagName("note"))) {
    if (!kid(n, "pitch") || kid(n, "chord") || kid(n, "grace")) continue;
    if ((text(n, "staff") ?? "1") !== "1") continue;
    const v = text(n, "voice") ?? "1";
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const mainVoice = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "1";

  let divisions = 1;
  let time: TimeSignature = { beats: 4, beatType: 4 };
  let clef: Clef | undefined;
  let transpose = 0;
  let firstTempo: number | undefined;
  let ending: { numbers: number[] } | undefined;
  const ticks = (d: number) => Math.round((d * TPQ) / divisions);
  const openTies = new Map<number, string>();
  const measures: (Measure & { clefUnknown?: boolean })[] = [];
  let tupletSeq = 0;
  let tuplet: { group: string; actual: number; normal: number; filled: number } | undefined;

  kids(part, "measure").forEach((mEl, mi) => {
    let pos = 0;
    let maxPos = 0;
    let lastStart = 0;
    const notes: ScoreNote[] = [];
    const m: Measure & { clefUnknown?: boolean } = { number: mEl.getAttribute("number") || String(mi + 1), length: 0, time, clef: clef ?? "treble", notes: [] };
    if (!clef) m.clefUnknown = true;
    const tempos: { offset: number; bpm: number }[] = [];
    const tempoAt = (bpm: number, at: number) => {
      if (!(bpm > 0)) return;
      if (firstTempo === undefined && mi === 0 && at === 0) firstTempo = bpm;
      else tempos.push({ offset: Math.max(0, ticks(at)), bpm });
    };

    for (const el of kids(mEl)) {
      switch (el.nodeName) {
        case "attributes": {
          divisions = num(el, "divisions") ?? divisions;
          const t = kid(el, "time");
          if (t) {
            const beatsText = text(t, "beats") ?? "4";
            const parts = beatsText.split("+").map(Number).filter((v) => v > 0);
            const beatType = num(t, "beat-type") ?? 4;
            const beats = parts.reduce((a, b) => a + b, 0) || 4;
            const symbol = t.getAttribute("symbol");
            time = {
              beats,
              beatType,
              ...(parts.length > 1 ? { grouping: parts.map((p) => (p * 4 * TPQ) / beatType) } : {}),
              ...(symbol === "common" || symbol === "cut" ? { symbol } : {}),
            };
            m.time = time;
          }
          for (const c of kids(el, "clef")) {
            if ((c.getAttribute("number") || "1") !== "1") continue;
            const sign = text(c, "sign");
            const octave = num(c, "clef-octave-change") ?? 0;
            const next: Clef | undefined = sign === "G" ? (octave === -1 ? "treble8vb" : "treble") : sign === "F" ? "bass" : undefined;
            clef = next;
            if (next) {
              m.clef = next;
              m.clefUnknown = false;
            } else {
              m.clefUnknown = true;
            }
          }
          const tr = kid(el, "transpose");
          if (tr) transpose = (num(tr, "chromatic") ?? 0) + 12 * (num(tr, "octave-change") ?? 0);
          break;
        }
        case "direction": {
          const offset = num(el, "offset") ?? 0;
          const sound = kid(el, "sound") ?? deep(el, "sound");
          const tempo = Number(sound?.getAttribute("tempo"));
          if (tempo > 0) tempoAt(tempo, pos + offset);
          else {
            const metro = deep(el, "metronome");
            const unit = text(metro, "beat-unit");
            const perMinute = num(metro, "per-minute");
            if (unit && perMinute) {
              const dotted = metro ? kids(metro, "beat-unit-dot").length : 0;
              const quarters = { whole: 4, half: 2, quarter: 1, eighth: 0.5, "16th": 0.25 }[unit] ?? 1;
              tempoAt(perMinute * quarters * (dotted ? 1.5 : 1), pos + offset);
            }
          }
          break;
        }
        case "sound": {
          const tempo = Number(el.getAttribute("tempo"));
          if (tempo > 0) tempoAt(tempo, pos);
          break;
        }
        case "backup":
          pos -= num(el, "duration") ?? 0;
          break;
        case "forward":
          pos += num(el, "duration") ?? 0;
          maxPos = Math.max(maxPos, pos);
          break;
        case "barline": {
          const location = el.getAttribute("location") || "right";
          const repeat = kid(el, "repeat");
          if (repeat?.getAttribute("direction") === "forward") m.repeatStart = true;
          if (repeat?.getAttribute("direction") === "backward") m.repeatEnd = Math.max(2, Number(repeat.getAttribute("times")) || 2);
          const style = text(el, "bar-style");
          if (location === "right" && style === "light-heavy" && !repeat) m.barline = "final";
          if (location === "right" && style === "light-light") m.barline = "double";
          const e = kid(el, "ending");
          if (e) {
            const type = e.getAttribute("type");
            const numbers = (e.getAttribute("number") || "1").split(/[,\s]+/).map((v) => parseInt(v, 10)).filter((v) => v > 0);
            if (type === "start") {
              ending = { numbers: numbers.length ? numbers : [1] };
              m.ending = { numbers: ending.numbers, start: true, stop: false };
            } else if (type === "stop" || type === "discontinue") {
              const nums = m.ending?.numbers ?? ending?.numbers ?? numbers;
              m.ending = { numbers: nums, start: m.ending?.start ?? false, stop: true, ...(type === "discontinue" ? { open: true } : {}) };
              ending = undefined;
            }
          }
          break;
        }
        case "note": {
          const chord = !!kid(el, "chord");
          if (kid(el, "grace")) break;
          const duration = num(el, "duration") ?? 0;
          const start = chord ? lastStart : pos;
          if (!chord) {
            lastStart = pos;
            pos += duration;
            maxPos = Math.max(maxPos, pos);
          }
          if (kid(el, "cue") || (text(el, "staff") ?? "1") !== "1" || (text(el, "voice") ?? "1") !== mainVoice) break;

          const pitchEl = kid(el, "pitch");
          const restEl = kid(el, "rest");
          if (!pitchEl && !restEl) break; // unpitched percussion
          let pitch: ScoreNote["pitch"];
          if (pitchEl) {
            const step = (text(pitchEl, "step") ?? "C").toUpperCase() as Step;
            const octave = num(pitchEl, "octave") ?? 4;
            let alter = num(pitchEl, "alter");
            const accEl = kid(el, "accidental");
            const accKey = accEl?.getAttribute("smufl") || accEl?.textContent?.trim() || "";
            if ((alter === undefined || Number.isInteger(alter)) && accKey in QUARTER_ACCIDENTALS) alter = QUARTER_ACCIDENTALS[accKey];
            alter ??= 0;
            pitch = { step, alter, octave, cents: pitchCents(step, alter, octave) + transpose * 100 };
          }

          if (chord) {
            // Keep the top note of a chord (the melody line).
            const prev = notes[notes.length - 1];
            if (pitch && prev?.pitch && prev.offset === ticks(start) && pitch.cents > prev.pitch.cents) prev.pitch = pitch;
            break;
          }

          const durTicks = ticks(duration);
          const tm = kid(el, "time-modification");
          const actual = num(tm, "actual-notes");
          const normal = num(tm, "normal-notes");
          const dots = kids(el, "dot").length;
          const typeText = text(el, "type");
          let type: NoteType;
          let dotCount = dots;
          if (typeText && NOTE_TYPES[typeText]) type = NOTE_TYPES[typeText];
          else if (restEl?.getAttribute("measure") === "yes") type = "whole"; // bar rests are drawn as whole rests
          else {
            const nominal = actual && normal ? Math.round((durTicks * actual) / normal) : durTicks;
            const v = valueOf(nominal);
            type = v?.type ?? "quarter";
            dotCount = v?.dots ?? 0;
          }

          const notations = kid(el, "notations");
          const tieTypes = [...kids(el, "tie"), ...(notations ? kids(notations, "tied") : [])].map((t) => t.getAttribute("type"));
          const tieStart = tieTypes.includes("start") || tieTypes.includes("continue");
          const tieStop = tieTypes.includes("stop") || tieTypes.includes("continue");

          // Tuplet bracket grouping: explicit start/stop when present, else by filled beat.
          let noteTuplet: ScoreNote["tuplet"];
          if (actual && normal && actual !== normal) {
            const marks = notations ? kids(notations, "tuplet").map((t) => t.getAttribute("type")) : [];
            if (!tuplet || marks.includes("start") || tuplet.actual !== actual || tuplet.normal !== normal) {
              tuplet = { group: `t${tupletSeq++}`, actual, normal, filled: 0 };
            }
            noteTuplet = { actual, normal, group: tuplet.group };
            tuplet.filled += durTicks;
            const done = marks.includes("stop") || (!marks.length && tuplet.filled % TPQ === 0);
            if (done) tuplet = undefined;
          } else {
            tuplet = undefined;
          }

          const id = `m${mi}n${notes.length}`;
          let sourceId = id;
          if (pitch) {
            const open = openTies.get(pitch.cents);
            if (tieStop && open) sourceId = open;
            if (tieStart) openTies.set(pitch.cents, sourceId);
            else openTies.delete(pitch.cents);
          }

          const lyricEl = kids(el, "lyric").find((l) => (l.getAttribute("number") || "1") === "1") ?? kid(el, "lyric");
          let lyric = text(lyricEl, "text");
          const syllabic = text(lyricEl, "syllabic");
          if (lyric && (syllabic === "begin" || syllabic === "middle") && !ARABIC.test(lyric)) lyric += "-";

          const beamEl = kids(el, "beam").find((b) => (b.getAttribute("number") || "1") === "1");
          const beamText = beamEl?.textContent?.trim();
          const beam = beamText === "begin" || beamText === "end" ? beamText : beamText ? "continue" : undefined;

          const dyn = Number(el.getAttribute("dynamics"));
          notes.push({
            id,
            sourceId,
            offset: ticks(start),
            duration: durTicks,
            type,
            dots: dotCount,
            ...(pitch ? { pitch } : {}),
            ...(pitch && tieStart ? { tieStart: true } : {}),
            ...(pitch && tieStop ? { tieStop: true } : {}),
            ...(noteTuplet ? { tuplet: noteTuplet } : {}),
            ...(restEl?.getAttribute("measure") === "yes" ? { measureRest: true } : {}),
            ...(lyric ? { lyric } : {}),
            ...(beam ? { beam } : {}),
            velocity: dyn > 0 ? Math.min(1, (dyn / 100) * 0.8) : 0.8,
          });
          break;
        }
      }
    }

    if (ending && !m.ending) m.ending = { numbers: ending.numbers, start: false, stop: false };
    const nominal = measureTicks(m.time);
    m.length = maxPos > 0 ? ticks(maxPos) : nominal;
    notes.sort((a, b) => a.offset - b.offset);
    m.notes = fillGaps(notes, m, mi);
    if (tempos.length) m.tempos = tempos;
    measures.push(m);
  });

  if (!measures.some((m) => m.notes.some((n) => n.pitch))) throw new ScoreImportError("empty");

  // Clef: use the file's when it is G or F; otherwise pick one from the range.
  if (measures.some((m) => m.clefUnknown)) {
    const guess = clefForRange(measures.flatMap((m) => m.notes.flatMap((n) => (n.pitch ? [n.pitch] : []))));
    for (const m of measures) if (m.clefUnknown) m.clef = guess;
  }
  for (const m of measures) delete m.clefUnknown;

  return { title, composer, tempo: firstTempo ?? 90, measures, source: "musicxml" };
}

/** The read voice may leave gaps (other voices, <forward>): show them as rests; an empty bar gets a bar rest. */
function fillGaps(notes: ScoreNote[], m: Measure, mi: number): ScoreNote[] {
  if (!notes.length) return [{ id: `m${mi}r`, sourceId: `m${mi}r`, offset: 0, duration: m.length, type: "whole", dots: 0, measureRest: true }];
  const out: ScoreNote[] = [];
  let cursor = 0;
  const gap = (from: number, to: number) => {
    for (const p of restPieces(from, to, m.time, m.length)) out.push({ id: `m${mi}g${p.offset}`, sourceId: `m${mi}g${p.offset}`, ...p });
  };
  const SLACK = TPQ / 32; // rounding of odd file divisions is not a rest
  for (const n of notes) {
    if (n.offset - cursor > SLACK) gap(cursor, n.offset);
    out.push(n);
    cursor = Math.max(cursor, n.offset + n.duration);
  }
  if (m.length - cursor > SLACK) gap(cursor, m.length);
  return out;
}
