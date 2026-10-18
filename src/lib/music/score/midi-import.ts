import { Midi } from "@tonejs/midi";
import { ScoreImportError } from "./musicxml";
import { notate, type BarFrame, type TimedEvent } from "./notate";
import { clefForRange, spellCents } from "./spell";
import { TPQ, measureTicks, type Score, type TimeSignature } from "./types";

/**
 * MIDI → Score. MIDI has no notation, so this one is reconstructed: the
 * chosen track is reduced to one line (top note), quantised to sixteenths,
 * spelled with Arab-practice defaults, and written into bars with ties.
 * Quarter-tones written as pitch bends (our own exports, Scala-tuned files)
 * are read back exactly, using the file's bend range when it declares one.
 */

export type MidiTrackInfo = { index: number; name: string; notes: number };

const isMelodicTrack = (t: Midi["tracks"][number]) => t.notes.length > 0 && t.channel !== 9 && !t.instrument.percussion;

export function midiTracks(bytes: Uint8Array): MidiTrackInfo[] {
  const midi = new Midi(bytes);
  return midi.tracks.flatMap((t, index) => (isMelodicTrack(t) ? [{ index, name: t.name || t.instrument.name || `${index + 1}`, notes: t.notes.length }] : []));
}

/** Likely melody: a track named like one, else the highest-sounding busy track. */
export function defaultMidiTrack(bytes: Uint8Array): number {
  const midi = new Midi(bytes);
  const candidates = midi.tracks.map((t, index) => ({ t, index })).filter(({ t }) => isMelodicTrack(t));
  if (!candidates.length) throw new ScoreImportError("empty");
  const named = candidates.find(({ t }) => /melod|voice|vocal|lead|chant|لحن|غناء/i.test(t.name));
  if (named) return named.index;
  const most = Math.max(...candidates.map(({ t }) => t.notes.length));
  const busy = candidates.filter(({ t }) => t.notes.length >= most / 4);
  const mean = (t: Midi["tracks"][number]) => t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length;
  return busy.sort((a, b) => mean(b.t) - mean(a.t))[0].index;
}

export function midiToScore(bytes: Uint8Array, trackIndex = defaultMidiTrack(bytes)): Score {
  const midi = new Midi(bytes);
  const track = midi.tracks[trackIndex];
  if (!track || !isMelodicTrack(track)) throw new ScoreImportError("empty");
  const toTicks = (t: number) => Math.round((t * TPQ) / midi.header.ppq);

  // Bend range from RPN 0 when the file declares it (we write ±2 semitones).
  const cc = track.controlChanges;
  const declared = cc[101]?.[0]?.value === 0 && cc[100]?.[0]?.value === 0 && cc[6]?.length ? Math.round(cc[6][0].value * 127) : 0;
  const bendRange = declared > 0 ? declared : 2;
  const bends = [...track.pitchBends].sort((a, b) => a.ticks - b.ticks);
  const bendAt = (ticks: number) => {
    let v = 0;
    for (const b of bends) {
      if (b.ticks > ticks) break;
      v = b.value;
    }
    return v;
  };

  const prefer = keyPreference(midi.header.keySignatures[0]);

  // One line: top note at each onset, each note cut where the next begins; quantised to sixteenths.
  const grid = TPQ / 4;
  const q = (t: number) => Math.round(t / grid) * grid;
  const raw = [...track.notes].sort((a, b) => a.ticks - b.ticks || b.midi - a.midi);
  const line: { start: number; end: number; cents: number; velocity: number }[] = [];
  for (const n of raw) {
    const start = q(toTicks(n.ticks));
    const end = Math.max(start + grid, q(toTicks(n.ticks + n.durationTicks)));
    const cents = (n.midi - 12) * 100 + bendAt(n.ticks) * bendRange * 100;
    const prev = line[line.length - 1];
    if (prev && prev.start === start) continue; // lower note of a chord
    if (prev && prev.end > start) prev.end = start;
    line.push({ start, end, cents, velocity: Math.max(0.3, Math.min(1, n.velocity)) });
  }
  const events: TimedEvent[] = line
    .filter((n) => n.end > n.start)
    .map((n, i) => {
      const s = spellCents(n.cents, prefer);
      return { start: n.start, end: n.end, pitch: { ...s, cents: n.cents }, sourceId: `e${i}`, velocity: n.velocity };
    });
  if (!events.length) throw new ScoreImportError("empty");

  // Bars from the time-signature track (changes included).
  const sigs = midi.header.timeSignatures.map((s) => ({ tick: toTicks(s.ticks), time: { beats: s.timeSignature[0], beatType: s.timeSignature[1] } as TimeSignature }));
  if (!sigs.length || sigs[0].tick > 0) sigs.unshift({ tick: 0, time: { beats: 4, beatType: 4 } });
  const last = events[events.length - 1].end;
  const clef = clefForRange(events.map((e) => e.pitch));
  const frames: BarFrame[] = [];
  for (let at = 0, guard = 0; at < last && guard < 10000; guard++) {
    const time = [...sigs].reverse().find((s) => s.tick <= at)!.time;
    const length = measureTicks(time);
    frames.push({ length, time, clef });
    at += length;
  }

  const measures = notate(events, frames);
  // Tempo changes inside bars.
  const tempos = midi.header.tempos.map((t) => ({ tick: toTicks(t.ticks), bpm: t.bpm }));
  let barStart = 0;
  for (const m of measures) {
    const inside = tempos.filter((t) => t.tick > 0 && t.tick >= barStart && t.tick < barStart + m.length);
    if (inside.length) m.tempos = inside.map((t) => ({ offset: t.tick - barStart, bpm: Math.round(t.bpm * 100) / 100 }));
    barStart += m.length;
  }
  const first = tempos.find((t) => t.tick === 0)?.bpm ?? tempos[0]?.bpm ?? 120;
  return { title: midi.header.name || track.name || undefined, tempo: Math.round(first * 100) / 100, measures, source: "midi" };
}

const RELATIVE_MAJOR: Record<string, string> = {
  A: "C", E: "G", B: "D", "F#": "A", "C#": "E", "G#": "B", "D#": "F#", D: "F", G: "Bb", C: "Eb", F: "Ab", Bb: "Db", Eb: "Gb",
};

/** Sharps or flats for the black keys, from the key signature (flats when there is none). */
function keyPreference(key: { key: string; scale: string } | undefined): "flat" | "sharp" {
  if (!key) return "flat";
  const major = key.scale === "minor" ? (RELATIVE_MAJOR[key.key] ?? key.key) : key.key;
  if (major === "C" || major.includes("b") || major === "F") return "flat";
  return "sharp";
}
