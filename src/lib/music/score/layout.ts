import { arabicToneName, spelledName } from "../notes";
import type { Locale } from "../types";
import { ENGRAVING, GLYPHS, type GlyphName } from "./glyphs";
import { accidentalGlyph, diatonic, staffPosition } from "./spell";
import { TPQ, type Clef, type Measure, type NoteType, type Score, type ScoreNote, type ScorePitch, type TimeSignature } from "./types";

/**
 * Pure score layout: Score + available width → positioned symbols. No DOM, so
 * it is unit-testable; the React view only draws what this returns.
 *
 * Coordinates are px. Each system is laid out with its top staff line at y = 0
 * and translated by `system.top` when drawn. Time runs left → right in every
 * language (music convention), like the piano roll.
 */

export type NameOptions = { solfege: boolean; arabic: boolean; lyrics: boolean };

export type LayoutOptions = {
  width: number;
  /** Staff space in px (distance between two staff lines). */
  sp: number;
  locale: Locale;
  names: NameOptions;
  /** Font size of the name rows, px. */
  nameSize?: number;
  /** Rendered width of a string in px. Defaults to an estimate (tests). */
  measureText?: (text: string, size: number) => number;
};

export type PlacedGlyph = { name: GlyphName; x: number; y: number; scale?: number };
export type PlacedText = { text: string; x: number; y: number; size: number; kind: "solfege" | "arabic" | "lyric" | "measure" | "volta" | "label" };
export type Rect = { x: number; y: number; w: number; h: number };

export type PlacedNote = {
  id: string;
  sourceId: string;
  measure: number;
  rest: boolean;
  pitch?: ScorePitch;
  /** Notehead (or rest) centre. */
  x: number;
  y: number;
  glyphs: PlacedGlyph[];
  dots: { x: number; y: number }[];
  stem?: Rect;
  ledgers: Rect[];
  texts: PlacedText[];
  /** Highlight and hit area. */
  box: Rect;
  /** Spoken/visible name, e.g. "ري (دوكاه)"; empty for rests. */
  name: string;
};

export type PlacedSystem = {
  /** Absolute y of the top staff line. */
  top: number;
  /** Vertical band of the system relative to `top` (for scrolling it into view). */
  bandTop: number;
  bandBottom: number;
  x1: number;
  x2: number;
  glyphs: PlacedGlyph[];
  rects: Rect[];
  /** Beams, as SVG polygon points. */
  polygons: string[];
  /** Ties (filled outlines). */
  fills: string[];
  /** Tuplet and volta brackets (stroked). */
  strokes: string[];
  circles: { x: number; y: number; r: number }[];
  texts: PlacedText[];
  notes: PlacedNote[];
};

export type ScoreLayout = { width: number; height: number; sp: number; nameSize: number; systems: PlacedSystem[] };

const ARABIC = /[؀-ۿ]/;
/** Rough text width used when no canvas is available (tests, server). */
export function estimateText(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += ch === " " ? 0.3 : ARABIC.test(ch) ? 0.56 : /[♭♯½]/.test(ch) ? 0.64 : /[A-Z]/.test(ch) ? 0.66 : 0.57;
  return w * size;
}

const HEAD: Record<NoteType, GlyphName> = {
  whole: "noteheadWhole", half: "noteheadHalf", quarter: "noteheadBlack", eighth: "noteheadBlack", "16th": "noteheadBlack", "32nd": "noteheadBlack", "64th": "noteheadBlack",
};
const REST: Record<NoteType, GlyphName> = {
  whole: "restWhole", half: "restHalf", quarter: "restQuarter", eighth: "rest8th", "16th": "rest16th", "32nd": "rest32nd", "64th": "rest64th",
};
const BEAMS: Record<NoteType, number> = { whole: 0, half: 0, quarter: 0, eighth: 1, "16th": 2, "32nd": 3, "64th": 4 };
const FLAGS: Record<number, [up: GlyphName, down: GlyphName]> = {
  1: ["flag8thUp", "flag8thDown"], 2: ["flag16thUp", "flag16thDown"], 3: ["flag32ndUp", "flag32ndDown"], 4: ["flag64thUp", "flag64thDown"],
};
/** Clef glyph and the staff line (from the top, in spaces) its origin sits on. */
const CLEFS: Record<Clef, { glyph: GlyphName; line: number }> = {
  treble: { glyph: "gClef", line: 3 }, treble8vb: { glyph: "gClef8vb", line: 3 }, bass: { glyph: "fClef", line: 1 },
};
// Bravura notehead stem anchors (stemUpSE / stemDownNW) and flag anchors, in spaces.
const STEM_ATTACH = 0.168;
const FLAG_UP_Y = 0.04;
const FLAG_DOWN_Y = 0.132;

const sameTime = (a: TimeSignature, b: TimeSignature) => a.beats === b.beats && a.beatType === b.beatType && a.symbol === b.symbol;
const r2 = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Start offsets of the beam spans of a bar: groups, half bars in 4/4, the whole bar in 2/4… */
function beamSpans(time: TimeSignature, length: number): number[] {
  if (time.grouping) {
    const out: number[] = [];
    time.grouping.reduce((at, g) => (out.push(at), at + g), 0);
    return out;
  }
  const beat = (4 * TPQ) / time.beatType;
  const every = (step: number) => Array.from({ length: Math.max(1, Math.ceil(length / step)) }, (_, i) => i * step);
  if (time.beatType === 8 && time.beats % 3 === 0) return every(3 * beat);
  // Usual Arabic groupings: samaʿi thaqil 10/8 = 3+2+2+3, dawr hindi 7/8 = 3+2+2.
  const additive = time.beatType === 8 ? ({ 10: [3, 2, 2, 3], 7: [3, 2, 2] } as Record<number, number[]>)[time.beats] : undefined;
  if (additive) {
    const out: number[] = [];
    additive.reduce((at, g) => (out.push(at), at + g * beat), 0);
    return out;
  }
  if (time.beatType === 4 && time.beats === 2) return [0];
  if (time.beatType === 4 && time.beats === 4) return every(2 * beat);
  if (time.beatType === 8 && time.beats <= 3) return [0];
  return every(beat);
}

/** Beat length for breaking secondary beams; additive x/8 groups (10/8, 7/8…) keep them whole. */
const beatTicks = (t: TimeSignature) =>
  t.beatType === 8 ? (t.beats % 3 === 0 ? 3 * (TPQ / 2) : Number.POSITIVE_INFINITY) : (4 * TPQ) / t.beatType;

function timeGlyphs(time: TimeSignature): { rows: GlyphName[][]; symbol?: GlyphName } {
  if (time.symbol === "common") return { rows: [], symbol: "timeSigCommon" };
  if (time.symbol === "cut") return { rows: [], symbol: "timeSigCutCommon" };
  const digits = (n: number) => String(n).split("").map((d) => `timeSig${d}` as GlyphName);
  return { rows: [digits(time.beats), digits(time.beatType)] };
}
const timeWidth = (time: TimeSignature) => {
  const { rows, symbol } = timeGlyphs(time);
  return symbol ? GLYPHS[symbol].w : Math.max(...rows.map((r) => r.reduce((s, g) => s + GLYPHS[g].w, 0)));
};

type Name = { text: string; kind: "solfege" | "arabic" | "lyric"; w: number };

type Prep = {
  n: ScoreNote;
  rest: boolean;
  p: number;
  head: GlyphName;
  acc?: GlyphName;
  beams: number;
  up: boolean;
  beamed: boolean;
  names: Name[];
  ideal: number;
  /** Extents around the head centre: symbols only, and including names. */
  leftGlyph: number;
  rightGlyph: number;
  nameHalf: number;
  label: string;
};

type PrepMeasure = {
  m: Measure;
  index: number;
  notes: Prep[];
  groups: number[][];
  showTime: boolean;
  clefChange: boolean;
  /** px: clef change + time signature when the bar is not first on its line. */
  lead: number;
  repeatStartW: number;
  endW: number;
  startPad: number;
  /** Centre-to-centre advances; the last one runs to the barline. */
  adv: number[];
};

export function layoutScore(score: Score, opts: LayoutOptions): ScoreLayout {
  const sp = opts.sp;
  const size = opts.nameSize ?? Math.round(clamp(sp * 1.3, 12, 15));
  const measure = opts.measureText ?? estimateText;
  const stemT = ENGRAVING.stemThickness * sp;
  const rows = (["solfege", "arabic", "lyrics"] as const).filter((k) => opts.names[k]);
  const hasLyrics = score.measures.some((m) => m.notes.some((n) => n.lyric));
  const nameRows = rows.filter((k) => k !== "lyrics" || hasLyrics);

  // ── 1. Per-bar analysis: positions, accidentals, names, beams, stems, spacing ──
  const prepared: PrepMeasure[] = score.measures.map((m, index) => {
    const prev = score.measures[index - 1];
    const accState = new Map<number, number>();
    const notes: Prep[] = m.notes.map((n) => {
      const rest = !n.pitch;
      const p = n.pitch ? staffPosition(n.pitch, m.clef) : 4;
      let acc: GlyphName | undefined;
      if (n.pitch && !n.tieStop) {
        const d = diatonic(n.pitch);
        const alter = Math.round(n.pitch.alter * 2) / 2;
        if (alter !== (accState.get(d) ?? 0)) acc = accidentalGlyph(alter);
        accState.set(d, alter);
      }
      const names: Name[] = [];
      let label = "";
      if (n.pitch && !n.tieStop) {
        const solfege = spelledName(n.pitch.step, n.pitch.alter, opts.locale);
        const arabic = arabicToneName(n.pitch.step, n.pitch.alter, n.pitch.octave) ?? "";
        label = arabic ? `${solfege} (${arabic})` : solfege;
        for (const kind of nameRows) {
          const text = kind === "solfege" ? solfege : kind === "arabic" ? arabic : (n.lyric ?? "");
          names.push({ text, kind: kind === "lyrics" ? "lyric" : kind, w: text ? measure(text, size) : 0 });
        }
      } else if (n.lyric && nameRows.includes("lyrics")) {
        names.push({ text: n.lyric, kind: "lyric", w: measure(n.lyric, size) });
      }
      const head = rest ? REST[n.measureRest ? "whole" : n.type] : HEAD[n.type];
      return {
        n, rest, p, head, acc, names, label,
        beams: rest ? 0 : BEAMS[n.type],
        up: p < 4,
        beamed: false,
        ideal: n.measureRest ? 4 * sp : sp * (1 + Math.log2(1 + (4 * n.duration) / TPQ)),
        leftGlyph: 0, rightGlyph: 0, nameHalf: 0,
      };
    });

    const groups = beamGroups(notes, m);
    for (const g of groups) {
      const ps = g.map((i) => notes[i].p);
      const up = Math.max(...ps) - 4 < 4 - Math.min(...ps);
      for (const i of g) Object.assign(notes[i], { up, beamed: true });
    }

    for (const q of notes) {
      const headW = GLYPHS[q.head].w * sp;
      const accW = q.acc ? (GLYPHS[q.acc].w + 0.25) * sp : 0;
      const dotsW = q.n.dots ? (0.3 + 0.55 * q.n.dots) * sp : 0;
      const flagW = !q.beamed && q.beams > 0 && q.up ? GLYPHS[FLAGS[q.beams][0]].w * sp : 0;
      q.leftGlyph = headW / 2 + accW;
      q.rightGlyph = headW / 2 + Math.max(dotsW, flagW);
      q.nameHalf = q.names.length ? Math.max(...q.names.map((x) => x.w)) / 2 + 0.35 * sp : 0;
    }

    const showTime = !prev || !sameTime(prev.time, m.time);
    const clefChange = !!prev && prev.clef !== m.clef;
    const lead = (clefChange ? GLYPHS[CLEFS[m.clef].glyph].w * 0.75 * sp + 0.6 * sp : 0) + (showTime ? (timeWidth(m.time) + 1) * sp : 0);
    const isLast = index === score.measures.length - 1;
    const endW = m.repeatEnd ? 1.9 * sp : isLast || m.barline === "final" ? 0.9 * sp : m.barline === "double" ? 0.6 * sp : 0;
    const first = notes[0];
    const startPad = first ? Math.max(1.0 * sp + first.leftGlyph, first.nameHalf + 0.3 * sp) : sp;
    const adv = notes.map((q, i) => {
      const next = notes[i + 1];
      if (!next) return Math.max(q.ideal, q.rightGlyph + 0.8 * sp, q.nameHalf + 0.3 * sp);
      return Math.max(q.ideal, q.rightGlyph + next.leftGlyph + 0.45 * sp, q.nameHalf + next.nameHalf);
    });
    return { m, index, notes, groups, showTime, clefChange, lead, repeatStartW: m.repeatStart ? 1.9 * sp : 0, endW, startPad, adv };
  });

  // ── 2. Line breaking and justification ──
  const x0 = 1;
  const usable = Math.max(opts.width - 2, 10 * sp);
  const prefixW = (pm: PrepMeasure) => (0.4 + GLYPHS[CLEFS[pm.m.clef].glyph].w + 0.8) * sp + (pm.showTime ? (timeWidth(pm.m.time) + 1) * sp : 0);
  const bodyW = (pm: PrepMeasure, firstOnLine: boolean) =>
    (firstOnLine ? 0 : pm.lead) + pm.repeatStartW + pm.startPad + pm.adv.reduce((a, b) => a + b, 0) + pm.endW;

  const lines: number[][] = [];
  let cur: number[] = [];
  let curW = 0;
  prepared.forEach((pm, i) => {
    if (cur.length && curW + bodyW(pm, false) > usable) {
      lines.push(cur);
      cur = [];
    }
    if (!cur.length) {
      cur = [i];
      curW = prefixW(pm) + bodyW(pm, true);
    } else {
      cur.push(i);
      curW += bodyW(pm, false);
    }
  });
  if (cur.length) lines.push(cur);

  // ── 3. Placement ──
  const systems: PlacedSystem[] = [];
  const allNotes: { note: PlacedNote; prep: Prep; system: number }[] = [];
  let cursorY = 0;
  let maxX = 0;

  lines.forEach((line, li) => {
    const pms = line.map((i) => prepared[i]);
    const natural = prefixW(pms[0]) + pms.reduce((s, pm, k) => s + bodyW(pm, k === 0), 0);
    const isLastLine = li === lines.length - 1;
    const stretch = natural < usable && !(isLastLine && natural < usable * 0.75) ? usable - natural : 0;
    const totalIdeal = pms.reduce((s, pm) => s + pm.notes.reduce((a, q) => a + q.ideal, 0), 0) || 1;

    const sys: PlacedSystem = { top: 0, bandTop: 0, bandBottom: 0, x1: x0, x2: x0, glyphs: [], rects: [], polygons: [], fills: [], strokes: [], circles: [], texts: [], notes: [] };
    let minY = 0;
    let maxY = 4 * sp;
    const ext = (...ys: number[]) => {
      for (const y of ys) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    };
    const glyphExt = (g: PlacedGlyph) => {
      const b = GLYPHS[g.name].bbox;
      const s = sp * (g.scale ?? 1);
      ext(g.y + b[1] * s, g.y + b[3] * s);
    };
    const pushGlyph = (g: PlacedGlyph, into: PlacedGlyph[] = sys.glyphs) => {
      into.push(g);
      glyphExt(g);
    };
    const barline = (x: number, kind: "thin" | "thick") => {
      const w = (kind === "thin" ? ENGRAVING.thinBarlineThickness : ENGRAVING.thickBarlineThickness) * sp;
      sys.rects.push({ x: x - w / 2, y: 0, w, h: 4 * sp });
      return w;
    };
    const repeatDots = (x: number) => {
      sys.circles.push({ x, y: 1.5 * sp, r: 0.2 * sp }, { x, y: 2.5 * sp, r: 0.2 * sp });
    };
    const placeTime = (time: TimeSignature, x: number) => {
      const { rows: digits, symbol } = timeGlyphs(time);
      if (symbol) {
        pushGlyph({ name: symbol, x, y: 2 * sp });
        return;
      }
      const rowW = digits.map((r) => r.reduce((s, g) => s + GLYPHS[g].w, 0) * sp);
      const w = Math.max(...rowW);
      digits.forEach((r, i) => {
        let gx = x + (w - rowW[i]) / 2;
        for (const g of r) {
          pushGlyph({ name: g, x: gx, y: (i === 0 ? 1 : 3) * sp });
          gx += GLYPHS[g].w * sp;
        }
      });
    };

    // Clef, then the time signature on the first line or when it changes.
    let x = x0;
    const clef = CLEFS[pms[0].m.clef];
    pushGlyph({ name: clef.glyph, x: x + 0.4 * sp, y: clef.line * sp });
    x += (0.4 + GLYPHS[clef.glyph].w + 0.8) * sp;
    if (pms[0].showTime) {
      placeTime(pms[0].m.time, x);
      x += (timeWidth(pms[0].m.time) + 1) * sp;
    }
    const notesStart = x;
    if (li > 0) {
      sys.texts.push({ text: pms[0].m.number, x: x0 + 0.2 * sp, y: -1.6 * sp, size: Math.max(10, Math.round(sp * 0.95)), kind: "measure" });
      ext(-2.8 * sp);
    }

    const placedInSystem: { note: PlacedNote; prep: Prep }[] = [];
    const barX: number[] = [];
    pms.forEach((pm, k) => {
      if (k > 0) {
        if (pm.clefChange) {
          const c = CLEFS[pm.m.clef];
          pushGlyph({ name: c.glyph, x: x + 0.2 * sp, y: c.line * sp, scale: 0.75 });
          x += GLYPHS[c.glyph].w * 0.75 * sp + 0.6 * sp;
        }
        if (pm.showTime) {
          placeTime(pm.m.time, x);
          x += (timeWidth(pm.m.time) + 1) * sp;
        }
      }
      if (pm.m.repeatStart) {
        const tk = ENGRAVING.thickBarlineThickness * sp;
        barline(x + tk / 2 + 0.1 * sp, "thick");
        barline(x + tk + 0.5 * sp, "thin");
        repeatDots(x + tk + 0.95 * sp);
        x += pm.repeatStartW;
      }
      const innerStart = x;
      let cx = x + pm.startPad;
      pm.notes.forEach((q, i) => {
        const placed = placeNote(q, cx, pm.index);
        placedInSystem.push({ note: placed, prep: q });
        cx += pm.adv[i] + (stretch * q.ideal) / totalIdeal;
      });
      const endX = cx;
      // Whole-bar rests sit in the middle of the bar.
      const only = placedInSystem[placedInSystem.length - 1];
      if (pm.notes.length === 1 && pm.notes[0].n.measureRest) {
        const mid = (innerStart + endX) / 2;
        shiftNote(only.note, mid - only.note.x);
      }
      // Barline(s).
      let right = endX;
      const isLast = pm.index === score.measures.length - 1;
      if (pm.m.repeatEnd) {
        repeatDots(endX + 0.35 * sp);
        barline(endX + 0.85 * sp, "thin");
        const tk = ENGRAVING.thickBarlineThickness * sp;
        barline(endX + 0.85 * sp + 0.4 * sp + tk / 2, "thick");
        right = endX + 0.85 * sp + 0.4 * sp + tk;
      } else if (isLast || pm.m.barline === "final") {
        barline(endX, "thin");
        const tk = ENGRAVING.thickBarlineThickness * sp;
        barline(endX + 0.4 * sp + tk / 2, "thick");
        right = endX + 0.4 * sp + tk;
      } else if (pm.m.barline === "double") {
        barline(endX, "thin");
        barline(endX + 0.45 * sp, "thin");
        right = endX + 0.45 * sp;
      } else if (!pms[k + 1]?.m.repeatStart) {
        // (a following repeat sign stands in for the plain barline)
        barline(endX, "thin");
      }
      barX.push(right);
      x = right;
    });
    sys.x2 = x;
    maxX = Math.max(maxX, x);

    // Beams (adjust the stems of beamed notes).
    let offsetInSystem = 0;
    pms.forEach((pm) => {
      for (const g of pm.groups) placeBeams(pm, g.map((i) => placedInSystem[offsetInSystem + i]));
      offsetInSystem += pm.notes.length;
    });

    // Tuplet numbers and brackets.
    placeTuplets(placedInSystem);

    // Volta brackets, all at one height on the line.
    const voltaY = Math.min(minY, -sp) - 1.6 * sp;
    pms.forEach((pm, k) => {
      const e = pm.m.ending;
      if (!e) return;
      const startX = (k === 0 ? notesStart - 0.6 * sp : barX[k - 1]) + 0.15 * sp;
      const endX = barX[k] - 0.3 * sp;
      const y = voltaY;
      const hook = 1.4 * sp;
      let d = `M${r2(startX)} ${r2(e.start ? y + hook : y)}V${r2(y)}H${r2(endX)}`;
      if (e.stop && !e.open) d += `V${r2(y + hook)}`;
      sys.strokes.push(d);
      ext(y - 1.4 * sp, y + hook);
      if (e.start) sys.texts.push({ text: `${e.numbers.join(", ")}.`, x: startX + 0.35 * sp, y: y + 1.15 * sp, size: Math.round(sp * 1.25), kind: "volta" });
    });

    // Section and modulation labels, above the volta bracket when the bar has one.
    pms.forEach((pm, k) => {
      if (!pm.m.label) return;
      const startX = (k === 0 ? notesStart - 0.6 * sp : barX[k - 1]) + 0.3 * sp;
      const y = voltaY - (pm.m.ending?.start ? 1.9 * sp : 0.2 * sp);
      const size = Math.max(11, Math.round(sp * 1.15));
      sys.texts.push({ text: pm.m.label, x: startX, y, size, kind: "label" });
      ext(y - size);
    });

    // Name rows under the staff, one baseline per row across the whole line.
    const base = Math.max(4 * sp + 2.0 * sp, maxY + 1.0 * sp) + size * 0.75;
    const rowY = (row: number) => base + row * size * 1.55;
    const lastRow = Math.max(0, nameRows.length - 1);
    for (const { note, prep } of placedInSystem) {
      prep.names.forEach((nm) => {
        if (!nm.text) return;
        const row = nameRows.indexOf(nm.kind === "lyric" ? "lyrics" : nm.kind);
        note.texts.push({ text: nm.text, x: note.x, y: rowY(row), size, kind: nm.kind });
      });
      const headW = GLYPHS[prep.head].w * sp;
      const nameW = prep.names.reduce((w, nm) => Math.max(w, nm.w), 0);
      const w = Math.max(headW + 0.8 * sp, nameW + 0.6 * sp, 1.6 * sp);
      const top = Math.min(note.y - 0.9 * sp, -0.6 * sp);
      const bottom = nameRows.length ? rowY(lastRow) + size * 0.4 : Math.max(note.y + 0.9 * sp, 4.6 * sp);
      note.box = { x: note.x - w / 2, y: top, w, h: bottom - top };
    }

    sys.bandTop = Math.min(minY, -sp) - 1.0 * sp;
    sys.bandBottom = (nameRows.length ? rowY(lastRow) + size * 0.5 : maxY) + 0.8 * sp;
    sys.top = cursorY - sys.bandTop;
    cursorY = sys.top + sys.bandBottom + 0.8 * sp;
    sys.notes = placedInSystem.map((p) => p.note);
    systems.push(sys);
    for (const p of placedInSystem) allNotes.push({ ...p, system: li });

    // — helpers that close over this system —
    function placeNote(q: Prep, cx: number, measureIndex: number): PlacedNote {
      const glyphs: PlacedGlyph[] = [];
      const headW = GLYPHS[q.head].w * sp;
      const note: PlacedNote = {
        id: q.n.id, sourceId: q.n.sourceId, measure: measureIndex, rest: q.rest, pitch: q.n.pitch,
        x: cx, y: 0, glyphs, dots: [], ledgers: [], texts: [], box: { x: 0, y: 0, w: 0, h: 0 }, name: q.label,
      };
      if (q.rest) {
        const y = (q.n.measureRest || q.n.type === "whole" ? 1 : 2) * sp;
        note.y = y;
        pushGlyph({ name: q.head, x: cx - headW / 2, y }, glyphs);
        for (let d = 0; d < q.n.dots; d++) note.dots.push({ x: cx + headW / 2 + (0.35 + 0.55 * d) * sp, y: 1.5 * sp });
        return note;
      }
      const y = ((8 - q.p) * sp) / 2;
      note.y = y;
      pushGlyph({ name: q.head, x: cx - headW / 2, y }, glyphs);
      if (q.acc) pushGlyph({ name: q.acc, x: cx - headW / 2 - (GLYPHS[q.acc].w + 0.25) * sp, y }, glyphs);
      const dotY = q.p % 2 === 0 ? y - sp / 2 : y;
      for (let d = 0; d < q.n.dots; d++) note.dots.push({ x: cx + headW / 2 + (0.35 + 0.55 * d) * sp, y: dotY });
      const lt = ENGRAVING.legerLineThickness * sp;
      const lx = cx - headW / 2 - ENGRAVING.legerLineExtension * sp;
      const lw = headW + 2 * ENGRAVING.legerLineExtension * sp;
      for (let pos = 10; pos <= q.p; pos += 2) note.ledgers.push({ x: lx, y: ((8 - pos) * sp) / 2 - lt / 2, w: lw, h: lt });
      for (let pos = -2; pos >= q.p; pos -= 2) note.ledgers.push({ x: lx, y: ((8 - pos) * sp) / 2 - lt / 2, w: lw, h: lt });
      ext(y - 0.5 * sp, y + 0.5 * sp);
      if (q.n.type !== "whole") {
        const len = (3.5 + (q.beams >= 3 ? 0.5 * (q.beams - 2) : 0)) * sp;
        const sx = q.up ? cx + headW / 2 - stemT / 2 : cx - headW / 2 + stemT / 2;
        const y1 = q.up ? y - STEM_ATTACH * sp : y + STEM_ATTACH * sp;
        let y2 = q.up ? y - len : y + len;
        if (q.up && y2 > 2 * sp) y2 = 2 * sp;
        if (!q.up && y2 < 2 * sp) y2 = 2 * sp;
        setStem(note, sx, y1, y2);
        if (!q.beamed && q.beams > 0) {
          const [flagUp, flagDown] = FLAGS[q.beams];
          pushGlyph(q.up ? { name: flagUp, x: sx - stemT / 2, y: y2 - FLAG_UP_Y * sp } : { name: flagDown, x: sx - stemT / 2, y: y2 + FLAG_DOWN_Y * sp }, glyphs);
        }
      }
      return note;
    }

    function placeBeams(pm: PrepMeasure, group: { note: PlacedNote; prep: Prep }[]) {
      const up = group[0].prep.up;
      const xs = group.map((g) => g.note.stem!.x + stemT / 2);
      const ys = group.map((g) => g.note.y);
      const n = group.length;
      const span = xs[n - 1] - xs[0] || 1;
      const rise = clamp((ys[n - 1] - ys[0]) * 0.5, -sp, sp);
      const dir = up ? -1 : 1;
      let y0 = (ys[0] + ys[n - 1]) / 2 + dir * 3.5 * sp - rise / 2;
      const lineY = (x: number) => y0 + (rise * (x - xs[0])) / span;
      const minStem = (i: number) => (2.8 + 0.75 * (group[i].prep.beams - 1)) * sp;
      let shift = 0;
      group.forEach((_, i) => {
        const need = up ? lineY(xs[i]) - (ys[i] - minStem(i)) : ys[i] + minStem(i) - lineY(xs[i]);
        shift = Math.max(shift, need);
      });
      // Beams of notes far outside the staff reach at least the middle line.
      group.forEach((_, i) => {
        shift = Math.max(shift, up ? lineY(xs[i]) - 2 * sp : 2 * sp - lineY(xs[i]));
      });
      y0 += dir * shift;
      group.forEach((g, i) => setStem(g.note, xs[i], ys[i] + dir * STEM_ATTACH * sp, lineY(xs[i])));

      const bt = ENGRAVING.beamThickness * sp;
      const gap = (ENGRAVING.beamThickness + ENGRAVING.beamSpacing) * sp;
      const quad = (xa: number, xb: number, level: number) => {
        const off = -dir * level * gap;
        const ya = lineY(xa) + off;
        const yb = lineY(xb) + off;
        const t = -dir * bt;
        sys.polygons.push(`${r2(xa)},${r2(ya)} ${r2(xb)},${r2(yb)} ${r2(xb)},${r2(yb + t)} ${r2(xa)},${r2(ya + t)}`);
        ext(ya, yb, ya + t, yb + t);
      };
      quad(xs[0] - stemT / 2, xs[n - 1] + stemT / 2, 0);
      const beat = beatTicks(pm.m.time);
      const maxBeams = Math.max(...group.map((g) => g.prep.beams));
      for (let level = 1; level < maxBeams; level++) {
        const has = (i: number) => group[i].prep.beams > level;
        const linked = (i: number) => i + 1 < n && has(i) && has(i + 1) && group[i + 1].prep.n.offset % beat !== 0;
        let i = 0;
        while (i < n) {
          if (!has(i)) {
            i++;
            continue;
          }
          let j = i;
          while (linked(j)) j++;
          if (j > i) {
            quad(xs[i] - stemT / 2, xs[j] + stemT / 2, level);
          } else {
            const len = Math.min(1.1 * sp, (n > 1 ? span / (n - 1) : sp) / 2);
            const prevDotted = i > 0 && group[i - 1].prep.n.dots > 0;
            const nextOnBeat = i + 1 < n && group[i + 1].prep.n.offset % beat === 0;
            const left = i === n - 1 || prevDotted || (i > 0 && nextOnBeat);
            if (left) quad(xs[i] - len, xs[i] + stemT / 2, level);
            else quad(xs[i] - stemT / 2, xs[i] + len, level);
          }
          i = j + 1;
        }
      }
    }

    function placeTuplets(list: { note: PlacedNote; prep: Prep }[]) {
      let i = 0;
      while (i < list.length) {
        const t = list[i].prep.n.tuplet;
        if (!t) {
          i++;
          continue;
        }
        let j = i;
        while (j + 1 < list.length && list[j + 1].prep.n.tuplet?.group === t.group) j++;
        const members = list.slice(i, j + 1);
        const pitched = members.filter((m) => !m.prep.rest);
        const up = pitched.length ? pitched.filter((m) => m.prep.up).length >= pitched.length / 2 : true;
        const ends = members.map((m) => (m.note.stem ? (up ? Math.min(m.note.stem.y, m.note.y - sp) : m.note.stem.y + m.note.stem.h) : m.note.y + (up ? -sp : sp)));
        const y = up ? Math.min(...ends, 0) - 1.1 * sp : Math.max(...ends, 4 * sp) + 1.1 * sp;
        const xa = members[0].note.x - 0.7 * sp;
        const xb = members[members.length - 1].note.x + 0.7 * sp;
        const xm = (members[0].note.x + members[members.length - 1].note.x) / 2;
        const digits = String(t.actual).split("").map((d) => `tuplet${d}` as GlyphName);
        const w = digits.reduce((s, g) => s + GLYPHS[g].w * sp, 0);
        let gx = xm - w / 2;
        for (const g of digits) {
          const b = GLYPHS[g].bbox;
          pushGlyph({ name: g, x: gx, y: y - ((b[1] + b[3]) / 2) * sp });
          gx += GLYPHS[g].w * sp;
        }
        const allBeamed = members.every((m) => m.prep.beamed) && members.length > 1;
        if (!allBeamed) {
          const hook = (up ? 1 : -1) * 0.6 * sp;
          const gapL = xm - w / 2 - 0.3 * sp;
          const gapR = xm + w / 2 + 0.3 * sp;
          sys.strokes.push(`M${r2(xa)} ${r2(y + hook)}V${r2(y)}H${r2(gapL)}M${r2(gapR)} ${r2(y)}H${r2(xb)}V${r2(y + hook)}`);
        }
        ext(y - 0.8 * sp, y + 0.8 * sp);
        i = j + 1;
      }
    }

    function setStem(note: PlacedNote, sx: number, y1: number, y2: number) {
      note.stem = { x: sx - stemT / 2, y: Math.min(y1, y2), w: stemT, h: Math.abs(y2 - y1) };
      ext(y1, y2);
    }
  });

  // ── 4. Ties (may cross lines) ──
  const tieWidth = (prep: Prep) => GLYPHS[prep.head].w * sp;
  allNotes.forEach((a, i) => {
    if (!a.prep.n.tieStart || !a.note.pitch) return;
    const b = allNotes.slice(i + 1, i + 8).find((c) => c.prep.n.tieStop && c.note.pitch && diatonic(c.note.pitch) === diatonic(a.note.pitch!) && c.note.pitch.alter === a.note.pitch!.alter);
    if (!b) return;
    const below = a.prep.n.type === "whole" ? a.prep.p < 4 : a.prep.up;
    const dir = below ? 1 : -1;
    const y = a.note.y + dir * 0.55 * sp;
    const xa = a.note.x + tieWidth(a.prep) / 2 + 0.1 * sp;
    const xb = b.note.x - tieWidth(b.prep) / 2 - 0.1 * sp;
    if (a.system === b.system) {
      systems[a.system].fills.push(tiePath(xa, xb, y, dir, sp));
    } else {
      systems[a.system].fills.push(tiePath(xa, systems[a.system].x2 - 0.3 * sp, y, dir, sp));
      const bs = systems[b.system];
      const firstX = bs.notes[0]?.x ?? b.note.x;
      systems[b.system].fills.push(tiePath(Math.min(firstX, b.note.x) - 2.2 * sp, xb, b.note.y + dir * 0.55 * sp, dir, sp));
    }
  });

  return { width: Math.ceil(Math.max(opts.width, maxX + 2)), height: Math.ceil(cursorY), sp, nameSize: size, systems };
}

function shiftNote(note: PlacedNote, dx: number) {
  note.x += dx;
  for (const g of note.glyphs) g.x += dx;
  for (const d of note.dots) d.x += dx;
}

function tiePath(x1: number, x2: number, y: number, dir: 1 | -1, sp: number): string {
  const len = Math.max(x2 - x1, 0.8 * sp);
  const end = x1 + len;
  const h = clamp(len * 0.16, 0.45 * sp, 1.1 * sp) * dir;
  const t = ENGRAVING.tieMidpointThickness * sp * dir;
  const a = x1 + len * 0.22;
  const b = end - len * 0.22;
  return `M${r2(x1)} ${r2(y)}C${r2(a)} ${r2(y + h)} ${r2(b)} ${r2(y + h)} ${r2(end)} ${r2(y)}C${r2(b)} ${r2(y + h - t)} ${r2(a)} ${r2(y + h - t)} ${r2(x1)} ${r2(y)}Z`;
}

/** Beam groups of a bar: explicit beams from a file, otherwise by beam span (rests break groups). */
function beamGroups(notes: Prep[], m: Measure): number[][] {
  const groups: number[][] = [];
  let cur: number[] = [];
  const close = () => {
    if (cur.length > 1) groups.push(cur);
    cur = [];
  };
  if (m.notes.some((n) => n.beam)) {
    notes.forEach((q, i) => {
      if (q.rest || !q.beams || !q.n.beam) return close();
      if (q.n.beam === "begin") close();
      cur.push(i);
      if (q.n.beam === "end") close();
    });
    close();
    return groups;
  }
  const spans = beamSpans(m.time, m.length);
  const spanOf = (t: number) => spans.filter((s) => s <= t).length - 1;
  notes.forEach((q, i) => {
    if (q.rest || !q.beams) return close();
    if (cur.length) {
      const head = notes[cur[0]].n;
      const prev = notes[cur[cur.length - 1]].n;
      if (spanOf(q.n.offset) !== spanOf(head.offset) || (prev.tuplet?.group ?? "") !== (q.n.tuplet?.group ?? "")) close();
    }
    cur.push(i);
  });
  close();
  return groups;
}
