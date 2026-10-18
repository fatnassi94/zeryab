import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import { compose } from "../composer/generate";
import { toMidiFile } from "../composer/midi";
import { toTimeline } from "../composer/timeline";
import { arabicToneName, spelledName, westernName } from "../notes";
import { getIqa } from "../composer/generate";
import { compositionToScore } from "./from-composition";
import { importScore, ScoreImportError } from "./import";
import { estimateText, layoutScore } from "./layout";
import { midiToScore } from "./midi-import";
import { parseMusicXml } from "./musicxml";
import { readMxl } from "./mxl";
import { notate, valueOf } from "./notate";
import { playOrder, scoreTimeline, secondsAt, soundingNotes } from "./playback";
import { pitchCents, spellCents, staffPosition } from "./spell";
import { TPQ, type Score } from "./types";

const parseXml = (xml: string) => new DOMParser().parseFromString(xml, "text/xml") as unknown as Document;
const fixture = readFileSync(new URL("./test-fixtures/rast-exercise.musicxml", import.meta.url), "utf8");
const pitched = (s: Score) => s.measures.flatMap((m) => m.notes.filter((n) => n.pitch));

describe("note names", () => {
  it("spells any alteration in each language", () => {
    expect(spelledName("E", -0.5, "ar")).toBe("مي ½♭");
    expect(spelledName("E", -0.5, "fr")).toBe("mi ½♭");
    expect(spelledName("F", 1, "en")).toBe("F♯");
    expect(spelledName("C", 0, "fr")).toBe("do");
    expect(westernName("sikah", "ar")).toBe("مي ½♭"); // unchanged behaviour
  });

  it("finds the Arabic tone name, with قرار/جواب outside the named octaves", () => {
    expect(arabicToneName("D", 0, 4)).toBe("دوكاه");
    expect(arabicToneName("E", -0.5, 4)).toBe("سيكاه");
    expect(arabicToneName("B", -0.5, 4)).toBe("أوج");
    expect(arabicToneName("F", 1, 4)).toBe("حجاز");
    expect(arabicToneName("G", -1, 4)).toBe("صبا");
    expect(arabicToneName("G", 0, 5)).toBe("جواب نوى");
    expect(arabicToneName("D", 0, 3)).toBe("قرار دوكاه");
    expect(arabicToneName("G", 1, 4)).toBeUndefined();
  });
});

describe("spelling and staff positions", () => {
  it("places pitches on the treble and bass staves", () => {
    expect(staffPosition({ step: "E", octave: 4 }, "treble")).toBe(0);
    expect(staffPosition({ step: "B", octave: 4 }, "treble")).toBe(4);
    expect(staffPosition({ step: "D", octave: 4 }, "treble")).toBe(-1);
    expect(staffPosition({ step: "G", octave: 2 }, "bass")).toBe(0);
    expect(staffPosition({ step: "E", octave: 3 }, "treble8vb")).toBe(0);
  });

  it("spells MIDI pitches with Arab-practice defaults, quarter-tones included", () => {
    expect(spellCents(pitchCents("E", -0.5, 4))).toEqual({ step: "E", alter: -0.5, octave: 4 });
    expect(spellCents(pitchCents("B", -1, 4))).toEqual({ step: "B", alter: -1, octave: 4 });
    expect(spellCents(pitchCents("F", 1, 4))).toEqual({ step: "F", alter: 1, octave: 4 });
    expect(spellCents(pitchCents("C", 1, 5), "sharp")).toEqual({ step: "C", alter: 1, octave: 5 });
  });
});

describe("notate (durations → written values)", () => {
  const types = (iqaId: string) => {
    const c = compose({ maqamId: "bayati-mashriqi", iqaId, seed: 3, cycles: 4 });
    return compositionToScore(c).measures[0].notes.map((n) => `${n.type}${".".repeat(n.dots)}${n.tieStart ? "~" : ""}`);
  };

  it("writes each iqaʿ as it is usually notated", () => {
    expect(types("maqsum")).toEqual(["eighth", "quarter", "eighth", "quarter", "quarter"]); // ♪♩♪♩♩
    expect(types("wahda")).toEqual(["quarter.", "quarter.", "quarter"]); // 3+3+2
    expect(types("samai-thaqil")).toEqual(["quarter.", "quarter", "eighth", "eighth", "quarter."]); // 3+2+2+3
    expect(types("malfuf")).toEqual(["eighth.", "eighth.", "eighth"]);
  });

  it("splits a whole bar of 10/8 along its 3+2+2+3 groups with ties", () => {
    const c = compose({ maqamId: "rast-mashriqi", iqaId: "samai-thaqil", seed: 1, cycles: 3 });
    const last = compositionToScore(c).measures.at(-1)!.notes;
    expect(last.map((n) => `${n.type}${".".repeat(n.dots)}`)).toEqual(["quarter.", "quarter", "quarter", "quarter."]);
    expect(last.slice(0, -1).every((n) => n.tieStart)).toBe(true);
    expect(new Set(last.map((n) => n.sourceId)).size).toBe(1);
  });

  it("fills gaps with beat-aligned rests and empty bars with a bar rest", () => {
    const pitch = { step: "C" as const, alter: 0, octave: 5, cents: 6000 };
    const frame = { length: 4 * TPQ, time: { beats: 4, beatType: 4 }, clef: "treble" as const };
    const ms = notate([{ start: 0, end: TPQ / 2, pitch, sourceId: "a" }], [frame, frame]);
    expect(ms[0].notes.map((n) => (n.pitch ? "n" : "r") + n.type)).toEqual(["neighth", "reighth", "rquarter", "rhalf"]);
    expect(ms[1].notes[0].measureRest).toBe(true);
    expect(valueOf(TPQ * 1.5)).toEqual({ type: "quarter", dots: 1 });
  });

  it("keeps every generated note and its exact pitch (spelling matches the maqam)", () => {
    const c = compose({ maqamId: "bayati-mashriqi", iqaId: "maqsum", seed: 42, cycles: 8 });
    const s = compositionToScore(c);
    const firstPieces = pitched(s).filter((n) => !n.tieStop);
    expect(firstPieces.map((n) => n.sourceId)).toEqual(c.notes.map((n) => n.id));
    const names = new Set(firstPieces.map((n) => spelledName(n.pitch!.step, n.pitch!.alter, "en")));
    expect([...names].every((x) => ["D", "E½♭", "F", "G", "A", "B♭", "C"].includes(x))).toBe(true);
  });
});

describe("MusicXML import", () => {
  const score = parseMusicXml(parseXml(fixture));

  it("reads title, tempo, pickup and bars", () => {
    expect(score.title).toBe("تمرين على مقام راست");
    expect(score.composer).toBe("Zeryab test fixture");
    expect(score.tempo).toBe(96);
    expect(score.measures).toHaveLength(7);
    expect(score.measures[0].length).toBe(TPQ / 2); // pickup eighth
    expect(score.measures[1].length).toBe(2 * TPQ);
    expect(score.measures[6].tempos).toEqual([{ offset: 0, bpm: 80 }]);
  });

  it("keeps quarter-tones from <alter> and from a quarter-flat accidental without alter", () => {
    const b = score.measures[1].notes[1].pitch!;
    expect([b.step, b.alter, b.cents]).toEqual(["B", -0.5, pitchCents("B", -0.5, 4)]);
    const e = score.measures[2].notes[3].pitch!; // <accidental>quarter-flat</accidental>, no <alter>
    expect([e.step, e.alter]).toEqual(["E", -0.5]);
  });

  it("reads one line: top note of chords, main voice only", () => {
    expect(score.measures[1].notes[0].pitch!.step).toBe("C"); // C5 over E4
    expect(score.measures[2].notes).toHaveLength(4); // voice 2's half note is skipped
  });

  it("keeps triplets, beams, rests, lyrics, ties, repeats and endings", () => {
    const trip = score.measures[2].notes.slice(0, 3);
    expect(trip.every((n) => n.tuplet?.actual === 3 && n.tuplet.group === trip[0].tuplet!.group)).toBe(true);
    expect(trip.map((n) => n.duration)).toEqual([320, 320, 320]);
    expect(score.measures[3].notes[2].pitch).toBeUndefined();
    expect(score.measures[0].notes[0].lyric).toBe("يا");
    expect(score.measures[1].repeatStart).toBe(true);
    expect(score.measures[4].repeatEnd).toBe(2);
    expect(score.measures[4].ending).toMatchObject({ numbers: [1], start: true, stop: true });
    expect(score.measures[5].ending).toMatchObject({ numbers: [2], start: true, stop: true, open: true });
    const tieEnd = score.measures[6].notes[0];
    expect(tieEnd.tieStop).toBe(true);
    expect(tieEnd.sourceId).toBe(score.measures[5].notes[2].sourceId);
  });

  it("reads the second part on request (bass clef)", () => {
    const oud = parseMusicXml(parseXml(fixture), 1);
    expect(oud.measures[1].clef).toBe("bass");
    expect(oud.measures[1].notes[0].pitch!.octave).toBe(3);
  });

  it("rejects files that are not MusicXML", async () => {
    await expect(importScore(new TextEncoder().encode("<html></html>"), parseXml)).rejects.toBeInstanceOf(ScoreImportError);
  });
});

describe("compressed MusicXML (.mxl)", () => {
  /** Minimal zip writer (deflate) — enough to build test archives. */
  function zip(files: Record<string, string>): Uint8Array {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    for (const [name, text] of Object.entries(files)) {
      const nameBytes = enc.encode(name);
      const data = deflateRawSync(enc.encode(text));
      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(8, 8, true);
      lv.setUint32(18, data.length, true);
      lv.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, 30);
      const cd = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(10, 8, true);
      cv.setUint32(20, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      chunks.push(local, data);
      central.push(cd);
      offset += local.length + data.length;
    }
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, central.length, true);
    ev.setUint16(10, central.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    const all = [...chunks, ...central, end];
    const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
    let p = 0;
    for (const c of all) {
      out.set(c, p);
      p += c.length;
    }
    return out;
  }

  it("finds the score through META-INF/container.xml and inflates it", async () => {
    const container = `<?xml version="1.0"?><container><rootfiles><rootfile full-path="score/song.musicxml"/></rootfiles></container>`;
    const bytes = zip({ "META-INF/container.xml": container, "score/song.musicxml": fixture });
    expect(new TextDecoder().decode(await readMxl(bytes))).toBe(fixture);
    const imported = await importScore(bytes, parseXml);
    expect(imported.format).toBe("mxl");
    expect(imported.parts.map((p) => p.name)).toEqual(["Voice", "Oud"]);
    expect(imported.score.measures).toHaveLength(7);
  });
});

describe("playback of a score", () => {
  const score = parseMusicXml(parseXml(fixture));

  it("unfolds the repeat with first and second endings", () => {
    expect(playOrder(score)).toEqual([0, 1, 2, 3, 4, 1, 2, 3, 5, 6]);
  });

  it("joins tied notes and follows tempo changes", () => {
    const { notes, tempos } = soundingNotes(score);
    const last = notes.at(-1)!;
    expect(last.end - last.start).toBe(3 * TPQ); // quarter tied to half
    expect(tempos).toEqual([{ tick: 0, bpm: 96 }, { tick: expect.any(Number), bpm: 80 }]);
    expect(secondsAt([{ tick: 0, bpm: 60 }], 2 * TPQ)).toBeCloseTo(2, 9);
    expect(secondsAt([{ tick: 0, bpm: 60 }, { tick: TPQ, bpm: 120 }], 2 * TPQ)).toBeCloseTo(1.5, 9);
  });

  it("produces exact quarter-tone frequencies, a drone on the final note and iqaʿ strokes per bar", () => {
    const t = scoreTimeline(score, { drone: true, iqa: getIqa("malfuf") });
    const b = t.melody.find((n) => Math.abs(n.pitch.cents - pitchCents("B", -0.5, 4)) < 1e-6)!;
    expect(b.frequency).toBeCloseTo(440 * 2 ** (150 / 1200), 6); // B½♭4 is 150¢ above A4
    expect(t.drone[0].pitch.cents % 1200).toBe(0); // final note C → drone on C
    const fullBars = playOrder(score).filter((i) => score.measures[i].length === 2 * TPQ).length;
    expect(t.percussion).toHaveLength(fullBars * getIqa("malfuf").events.length);
    // Slider doubles every tempo.
    expect(scoreTimeline(score, { quarterBpm: 192 }).duration).toBeCloseTo(t.duration / 2, 6);
  });
});

describe("MIDI import", () => {
  it("round-trips a generated melody: same onsets, same cents (quarter-tones from pitch bends)", () => {
    const c = compose({ maqamId: "bayati-mashriqi", iqaId: "maqsum", seed: 11, cycles: 4, quarterBpm: 100 });
    const score = midiToScore(toMidiFile(c));
    const expected = toTimeline(c).melody;
    const got = soundingNotes(score).notes;
    expect(got).toHaveLength(expected.length);
    got.forEach((n, i) => {
      expect(Math.abs(n.cents - expected[i].pitch.cents)).toBeLessThanOrEqual(1);
      expect((n.start / TPQ) * (60 / 100)).toBeCloseTo(expected[i].time, 6);
    });
    expect(score.tempo).toBeCloseTo(100, 1);
    expect(pitched(score).some((n) => n.pitch!.alter === -0.5)).toBe(true);
  });
});

describe("layout", () => {
  const comp = compose({ maqamId: "rast-mashriqi", iqaId: "maqsum", seed: 5, cycles: 8 });
  const score = compositionToScore(comp);
  const names = { solfege: true, arabic: true, lyrics: false };

  it("fits each line in the width and keeps the names apart", () => {
    for (const width of [340, 720, 1200]) {
      const l = layoutScore(score, { width, sp: 9, locale: "ar", names });
      expect(l.systems.length).toBeGreaterThan(0);
      for (const s of l.systems) {
        if (s.notes.some((n) => n.measure === s.notes[0].measure) && l.systems.length > 1) expect(s.x2).toBeLessThanOrEqual(Math.max(width, l.width));
        const texts = s.notes.flatMap((n) => n.texts.filter((t) => t.kind === "solfege"));
        for (let i = 1; i < texts.length; i++) {
          const a = texts[i - 1];
          const b = texts[i];
          expect(a.x + estimateText(a.text, a.size) / 2).toBeLessThanOrEqual(b.x - estimateText(b.text, b.size) / 2 + 0.5);
        }
      }
    }
  });

  it("puts a name under every sounding note and none under rests or tie continuations", () => {
    const l = layoutScore(score, { width: 900, sp: 10, locale: "fr", names });
    const notes = l.systems.flatMap((s) => s.notes);
    for (const n of notes) {
      const named = !n.rest && !score.measures[n.measure].notes.find((x) => x.id === n.id)?.tieStop;
      expect(n.texts.length > 0).toBe(named);
    }
    expect(notes.find((n) => !n.rest)!.name).toMatch(/^do \(راست\)$/);
  });

  it("prints a quarter-flat once per bar, then again after the barline", () => {
    const xml = parseMusicXml(parseXml(fixture));
    const l = layoutScore(xml, { width: 2000, sp: 10, locale: "en", names });
    const bar3 = l.systems[0].notes.filter((n) => n.measure === 3 && !n.rest);
    const bar4 = l.systems[0].notes.filter((n) => n.measure === 4 && !n.rest);
    const accidental = (n: (typeof bar3)[number]) => n.glyphs.find((g) => g.name.startsWith("accidental"))?.name;
    expect(accidental(bar3[1])).toBe("accidentalQuarterToneFlatArabic");
    expect(accidental(bar4[0])).toBe("accidentalQuarterToneFlatArabic");
    expect(accidental(bar4[1])).toBeUndefined(); // D natural, no sign
  });

  it("beams the triplet and the file's eighth pairs, and draws a tie", () => {
    const xml = parseMusicXml(parseXml(fixture));
    const l = layoutScore(xml, { width: 2000, sp: 10, locale: "en", names });
    expect(l.systems[0].polygons.length).toBeGreaterThanOrEqual(5);
    expect(l.systems.flatMap((s) => s.fills).length).toBeGreaterThanOrEqual(1);
    expect(l.systems[0].glyphs.some((g) => g.name === "tuplet3")).toBe(true);
  });
});
