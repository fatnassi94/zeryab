import { Midi } from "@tonejs/midi";
import { describe, expect, it } from "vitest";
import { degreesOf, getMaqam } from "../maqam/engine";
import { MAQAMAT } from "../maqam/data/maqamat";
import { IQAAT } from "../rhythm/data/iqaat";
import { removeNote, setTempo, shiftDegree } from "./edit";
import { compose, getIqa, planPhrases } from "./generate";
import { readMelodyCents, toMidiFile } from "./midi";
import { toTimeline } from "./timeline";

const base = { maqamId: "bayati-mashriqi", iqaId: "maqsum", seed: 42, cycles: 8 } as const;

describe("compose", () => {
  it("is deterministic: same inputs and seed ⇒ identical composition", () => {
    expect(compose(base)).toEqual(compose(base));
  });

  it("changes with the seed", () => {
    const a = compose(base).notes.map((n) => n.degree);
    const b = compose({ ...base, seed: 43 }).notes.map((n) => n.degree);
    expect(a).not.toEqual(b);
  });

  it.each(MAQAMAT.flatMap((m) => IQAAT.map((i) => [m.id, i.id] as const)))("%s × %s stays in range and cadences on the tonic", (maqamId, iqaId) => {
    for (const seed of [1, 7, 99]) {
      const c = compose({ maqamId, iqaId, seed, cycles: 6 });
      const top = degreesOf(getMaqam(maqamId)).length - 1;
      const iqa = getIqa(iqaId);
      for (const n of c.notes) {
        expect(n.degree).toBeGreaterThanOrEqual(0);
        expect(n.degree).toBeLessThanOrEqual(top);
        expect(n.durationPulses).toBeGreaterThan(0);
        // Every note starts on a stroke of the iqaʿ.
        expect(iqa.events.map((e) => e.pulse)).toContain(n.startPulse % iqa.pulses);
      }
      const last = c.notes.at(-1)!;
      expect(last.degree).toBe(0);
      // Final tonic begins on the last cycle's first stroke (a dum) and lasts to the end.
      expect(last.startPulse).toBe((c.cycles - 1) * iqa.pulses + iqa.events[0].pulse);
      expect(iqa.events[0].stroke).toBe("dum");
      expect(last.startPulse + last.durationPulses).toBe(c.cycles * iqa.pulses);
    }
  });

  it("approaches the final tonic by step or third, not by a wide leap", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const notes = compose({ ...base, seed }).notes;
      const tail = notes.slice(-4).map((n) => n.degree);
      for (let i = 1; i < tail.length; i++) expect(Math.abs(tail[i] - tail[i - 1])).toBeLessThanOrEqual(2);
    }
  });

  it("is mostly stepwise", () => {
    let steps = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const d = compose({ ...base, seed, cycles: 16 }).notes.map((n) => n.degree);
      for (let i = 1; i < d.length; i++) {
        total++;
        if (Math.abs(d[i] - d[i - 1]) <= 1) steps++;
      }
    }
    expect(steps / total).toBeGreaterThan(0.65);
  });

  it("plans opening → development → climax → cadence", () => {
    expect(planPhrases(getMaqam("bayati-mashriqi"), 8).map((p) => [p.role, p.cycles])).toEqual([
      ["opening", 3],
      ["development", 2],
      ["climax", 2],
      ["cadence", 1],
    ]);
  });
});

describe("edit", () => {
  const c = compose(base);
  const id = c.notes[3].id;

  it("shifts by scale degree within range and returns a new object", () => {
    const up = shiftDegree(c, id, 1);
    expect(up).not.toBe(c);
    expect(up.notes[3].degree).toBe(Math.min(7, c.notes[3].degree + 1));
    expect(shiftDegree(c, id, -99).notes[3].degree).toBe(0);
    expect(c.notes[3].degree).toBe(compose(base).notes[3].degree); // original untouched
  });

  it("removing a note extends the previous one (no gap)", () => {
    const r = removeNote(c, id);
    expect(r.notes).toHaveLength(c.notes.length - 1);
    expect(r.notes[2].durationPulses).toBe(c.notes[2].durationPulses + c.notes[3].durationPulses);
  });

  it("clamps tempo", () => {
    expect(setTempo(c, 500).quarterBpm).toBe(240);
  });
});

describe("timeline", () => {
  it("turns degrees into exact frequencies and times", () => {
    const c = compose({ ...base, quarterBpm: 120 });
    const t = toTimeline(c);
    expect(t.pulseSeconds).toBeCloseTo(0.25, 12);
    expect(t.duration).toBeCloseTo(8 * 2, 9);
    // Final note = Dukah D4 ≈ 293.665 Hz.
    expect(t.melody.at(-1)!.frequency).toBeCloseTo(293.665, 2);
    // Drone an octave below the tonic.
    expect(t.drone[0].frequency).toBeCloseTo(293.665 / 2, 2);
    expect(t.percussion).toHaveLength(8 * getIqa("maqsum").events.length);
  });

  it("produces quarter-tone frequencies for Sikah (not a semitone)", () => {
    const c = compose(base);
    const sikah = toTimeline(c).melody.find((_, i) => c.notes[i].degree === 1);
    expect(sikah).toBeDefined();
    expect(sikah!.frequency).toBeCloseTo(Math.sqrt(311.127 * 329.628), 1);
  });
});

describe("MIDI export", () => {
  const c = compose(base);
  const bytes = toMidiFile(c);
  const midi = new Midi(bytes);

  it("writes melody, drone and percussion on the documented channels", () => {
    expect(midi.tracks.map((t) => t.channel)).toEqual([0, 1, 9]);
    expect(midi.header.tempos[0].bpm).toBeCloseTo(c.quarterBpm, 2); // stored as whole µs per beat
  });

  it("declares the pitch-bend range via RPN 0", () => {
    const cc = midi.tracks[0].controlChanges;
    expect(cc[101]?.[0].value).toBe(0);
    expect(cc[6]?.[0].value * 127).toBeCloseTo(2, 6);
  });

  it("round-trips every melodic note within ±1 cent (quarter-tones survive)", () => {
    const expected = toTimeline(c).melody.map((n) => n.pitch.cents);
    const read = readMelodyCents(bytes).map((n) => n.cents);
    expect(read).toHaveLength(expected.length);
    read.forEach((cents, i) => expect(Math.abs(cents - expected[i])).toBeLessThanOrEqual(1));
    expect(read.some((cents) => cents % 100 !== 0)).toBe(true); // some notes really are microtonal
  });

  it("is byte-identical for the same composition", () => {
    expect(Buffer.from(toMidiFile(c)).equals(Buffer.from(bytes))).toBe(true);
  });
});
