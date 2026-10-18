import { Midi } from "@tonejs/midi";
import { getMaqam } from "../maqam/engine";
import { toMidi } from "../pitch";
import { getIqa } from "./generate";
import { toTimeline } from "./timeline";
import type { Composition } from "./types";

/** Pitch-bend range written into the file (RPN 0), in semitones. */
export const BEND_RANGE_SEMITONES = 2;
const RAW_BEND_MAX = 8191;

/** General MIDI percussion keys used for the iqaʿ strokes (documented in the file). */
export const PERCUSSION_KEYS = { dum: 35, tak: 37, ka: 42 } as const; // acoustic bass drum, side stick, closed hi-hat

/**
 * MIDI export that keeps quarter-tones:
 * - melody on channel 0, drone on channel 1, percussion on channel 9 (GM drums);
 * - each melodic note gets a pitch bend just before it (lines are monophonic,
 *   so one channel per line is enough — no two notes share a bend);
 * - the bend range is written as RPN 0 so receivers don't have to guess.
 *
 * Library quirk (@tonejs/midi 2.0.28): pitch bends are READ normalised to
 * −1…1 but WRITTEN as raw 14-bit offsets (−8192…8191). We therefore pass raw
 * values here; the round-trip test locks this in.
 */
export function toMidiFile(c: Composition): Uint8Array {
  const t = toTimeline(c);
  const variant = getMaqam(c.maqamId);
  const iqa = getIqa(c.iqaId);
  const midi = new Midi();
  midi.header.setTempo(c.quarterBpm);
  const [num] = iqa.meter.split("/").map(Number);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [num, Number(iqa.meter.split("/")[1])] });
  midi.header.name = `${variant.names.en} · ${iqa.names.en}`;
  midi.header.meta.push({
    ticks: 0,
    type: "text",
    text: `maqam=${variant.id}; iqa=${iqa.id}; tuning=${c.tuningId}; A4=440Hz; seed=${c.seed}; pitchBendRange=±${BEND_RANGE_SEMITONES} semitones; data status=${variant.provenance.status}`,
  });

  const writeBendRange = (track: ReturnType<Midi["addTrack"]>) => {
    // RPN 0 (pitch-bend sensitivity) = BEND_RANGE_SEMITONES, then null RPN.
    for (const [number, value] of [[101, 0], [100, 0], [6, BEND_RANGE_SEMITONES], [38, 0], [101, 127], [100, 127]] as const) {
      track.addCC({ number, value: value / 127, time: 0 });
    }
  };

  const melody = midi.addTrack();
  melody.name = "Melody";
  melody.channel = 0;
  writeBendRange(melody);
  for (const n of t.melody) {
    const { note, detuneCents } = toMidi(n.pitch);
    const raw = Math.max(-RAW_BEND_MAX - 1, Math.min(RAW_BEND_MAX, Math.round((detuneCents / (BEND_RANGE_SEMITONES * 100)) * 8192)));
    melody.addPitchBend({ time: n.time, value: raw });
    melody.addNote({ midi: note, time: n.time, duration: n.duration, velocity: n.velocity });
  }

  if (t.drone.length) {
    const drone = midi.addTrack();
    drone.name = "Drone";
    drone.channel = 1;
    writeBendRange(drone);
    for (const d of t.drone) {
      const { note, detuneCents } = toMidi(d.pitch);
      drone.addPitchBend({ time: 0, value: Math.round((detuneCents / (BEND_RANGE_SEMITONES * 100)) * 8192) });
      drone.addNote({ midi: note, time: d.time, duration: d.duration, velocity: d.velocity });
    }
  }

  if (t.percussion.length) {
    const perc = midi.addTrack();
    perc.name = "Percussion (dum=35, tak=37, ka=42)";
    perc.channel = 9;
    for (const h of t.percussion) {
      perc.addNote({ midi: PERCUSSION_KEYS[h.stroke], time: h.time, duration: 0.1, velocity: h.velocity });
    }
  }

  return midi.toArray();
}

/** Read back the cents of each melodic note (for tests and verification). */
export function readMelodyCents(bytes: Uint8Array): { time: number; cents: number }[] {
  const midi = new Midi(bytes);
  const track = midi.tracks.find((tr) => tr.channel === 0 && tr.notes.length);
  if (!track) return [];
  return track.notes.map((n) => {
    const bend = [...track.pitchBends].reverse().find((pb) => pb.ticks <= n.ticks);
    const detune = (bend?.value ?? 0) * BEND_RANGE_SEMITONES * 100;
    return { time: n.time, cents: (n.midi - 12) * 100 + detune };
  });
}
