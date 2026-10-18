import { diatonic } from "./spell";
import { TPQ, measureTicks, type Clef, type Measure, type Score, type ScoreNote } from "./types";

/**
 * Score → MusicXML 4.0 (score-partwise, one part). Used to store songs in the
 * club library and to download them for editing in MuseScore & co. Exact
 * alterations go in <alter> (−0.5 for a half-flat) and the displayed sign in
 * <accidental> (quarter-flat…), following the same per-bar rule as the view.
 */

export const MUSICXML_MIME = "application/vnd.recordare.musicxml+xml";

const ACCIDENTALS: Record<string, string> = {
  "-2": "flat-flat", "-1.5": "three-quarters-flat", "-1": "flat", "-0.5": "quarter-flat", "0": "natural",
  "0.5": "quarter-sharp", "1": "sharp", "1.5": "three-quarters-sharp", "2": "double-sharp",
};

const CLEFS: Record<Clef, string> = {
  treble: "<clef><sign>G</sign><line>2</line></clef>",
  treble8vb: "<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>",
  bass: "<clef><sign>F</sign><line>4</line></clef>",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const num = (v: number) => String(Math.round(v * 1000) / 1000);

export function scoreToMusicXml(score: Score): string {
  let g = TPQ;
  for (const m of score.measures) {
    g = gcd(g, m.length);
    for (const n of m.notes) g = gcd(gcd(g, n.offset), n.duration);
    for (const t of m.tempos ?? []) g = gcd(g, t.offset);
  }
  const div = (ticks: number) => ticks / g;
  const metronome = (bpm: number, offset = 0) =>
    `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${num(bpm)}</per-minute></metronome></direction-type>${offset ? `<offset>${div(offset)}</offset>` : ""}<sound tempo="${num(bpm)}"/></direction>`;

  const out: string[] = [
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
    `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`,
    `<score-partwise version="4.0">`,
    ...(score.title ? [`<work><work-title>${esc(score.title)}</work-title></work>`] : []),
    `<identification>${score.composer ? `<creator type="composer">${esc(score.composer)}</creator>` : ""}<encoding><software>Zeryab Maqam lab</software></encoding></identification>`,
    `<part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>`,
    `<part id="P1">`,
  ];

  let prev: Measure | undefined;
  score.measures.forEach((m, i) => {
    const pickup = i === 0 && m.length < measureTicks(m.time);
    out.push(`<measure number="${esc(m.number)}"${pickup ? ` implicit="yes"` : ""}>`);
    if (m.repeatStart || m.ending?.start) {
      out.push(
        `<barline location="left">${m.repeatStart ? "<bar-style>heavy-light</bar-style>" : ""}${m.ending?.start ? `<ending number="${m.ending.numbers.join(", ")}" type="start"/>` : ""}${m.repeatStart ? `<repeat direction="forward"/>` : ""}</barline>`,
      );
    }
    const timeChanged = !prev || prev.time.beats !== m.time.beats || prev.time.beatType !== m.time.beatType || prev.time.symbol !== m.time.symbol;
    const clefChanged = !prev || prev.clef !== m.clef;
    if (timeChanged || clefChanged) {
      const beatTicks = (4 * TPQ) / m.time.beatType;
      const beats = m.time.grouping ? m.time.grouping.map((t) => num(t / beatTicks)).join("+") : String(m.time.beats);
      const time = `<time${m.time.symbol ? ` symbol="${m.time.symbol}"` : ""}><beats>${beats}</beats><beat-type>${m.time.beatType}</beat-type></time>`;
      out.push(`<attributes>${i === 0 ? `<divisions>${TPQ / g}</divisions>` : ""}${timeChanged ? time : ""}${clefChanged ? CLEFS[m.clef] : ""}</attributes>`);
    }
    if (i === 0) out.push(metronome(score.tempo));
    for (const t of m.tempos ?? []) out.push(metronome(t.bpm, t.offset));

    const shown = new Map<number, number>();
    const tupletEnd = (k: number) => m.notes[k + 1]?.tuplet?.group !== m.notes[k].tuplet?.group;
    m.notes.forEach((n, k) => out.push(noteXml(n, shown, k === 0 || m.notes[k - 1].tuplet?.group !== n.tuplet?.group, tupletEnd(k), div)));

    const last = i === score.measures.length - 1;
    const style = m.repeatEnd || m.barline === "final" || (last && !m.barline) ? "light-heavy" : m.barline === "double" ? "light-light" : "";
    if (style || m.ending?.stop || m.repeatEnd) {
      const ending = m.ending?.stop ? `<ending number="${m.ending.numbers.join(", ")}" type="${m.ending.open ? "discontinue" : "stop"}"/>` : "";
      const repeat = m.repeatEnd ? `<repeat direction="backward"${m.repeatEnd > 2 ? ` times="${m.repeatEnd}"` : ""}/>` : "";
      out.push(`<barline location="right">${style ? `<bar-style>${style}</bar-style>` : ""}${ending}${repeat}</barline>`);
    }
    out.push(`</measure>`);
    prev = m;
  });
  out.push(`</part>`, `</score-partwise>`, "");
  return out.join("\n");
}

function noteXml(n: ScoreNote, shown: Map<number, number>, tupletStart: boolean, tupletStop: boolean, div: (t: number) => number): string {
  const parts: string[] = ["<note>"];
  let accidental = "";
  if (n.pitch) {
    const { step, alter, octave } = n.pitch;
    parts.push(`<pitch><step>${step}</step>${alter ? `<alter>${num(alter)}</alter>` : ""}<octave>${octave}</octave></pitch>`);
    if (!n.tieStop) {
      const d = diatonic(n.pitch);
      const q = Math.round(alter * 2) / 2;
      if (q !== (shown.get(d) ?? 0)) accidental = ACCIDENTALS[String(q)] ?? "";
      shown.set(d, q);
    }
  } else {
    parts.push(n.measureRest ? `<rest measure="yes"/>` : "<rest/>");
  }
  parts.push(`<duration>${div(n.duration)}</duration>`);
  if (n.tieStop) parts.push(`<tie type="stop"/>`);
  if (n.tieStart) parts.push(`<tie type="start"/>`);
  parts.push(`<voice>1</voice>`);
  if (!n.measureRest) parts.push(`<type>${n.type}</type>`, "<dot/>".repeat(n.dots));
  if (accidental) parts.push(`<accidental>${accidental}</accidental>`);
  if (n.tuplet) parts.push(`<time-modification><actual-notes>${n.tuplet.actual}</actual-notes><normal-notes>${n.tuplet.normal}</normal-notes></time-modification>`);
  const notations = [
    n.tieStop ? `<tied type="stop"/>` : "",
    n.tieStart ? `<tied type="start"/>` : "",
    n.tuplet && tupletStart ? `<tuplet type="start"/>` : "",
    n.tuplet && tupletStop ? `<tuplet type="stop"/>` : "",
  ].join("");
  if (notations) parts.push(`<notations>${notations}</notations>`);
  if (n.lyric) {
    const begin = n.lyric.endsWith("-");
    parts.push(`<lyric number="1"><syllabic>${begin ? "begin" : "single"}</syllabic><text>${esc(begin ? n.lyric.slice(0, -1) : n.lyric)}</text></lyric>`);
  }
  parts.push("</note>");
  return parts.join("");
}
