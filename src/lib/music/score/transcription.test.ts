import { readFileSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import { compose } from "../composer/generate";
import { parseTranscription, TRANSCRIPTION_SCHEMA, transcriptionToScore, unevenBars, type TranscribedNote, type Transcription } from "./ai-transcription";
import { compositionToScore } from "./from-composition";
import { layoutScore } from "./layout";
import { parseMusicXml } from "./musicxml";
import { scoreToMusicXml } from "./musicxml-write";
import { playOrder, soundingNotes } from "./playback";
import { pitchCents } from "./spell";
import { TPQ, type Score } from "./types";

const parseXml = (xml: string) => new DOMParser().parseFromString(xml, "text/xml") as unknown as Document;
const fixture = readFileSync(new URL("./test-fixtures/rast-exercise.musicxml", import.meta.url), "utf8");

/** What a reader cares about, independent of ids. */
const essence = (s: Score) =>
  s.measures.map((m) => ({
    length: m.length,
    time: `${m.time.beats}/${m.time.beatType}`,
    clef: m.clef,
    repeatStart: !!m.repeatStart,
    repeatEnd: m.repeatEnd ?? 0,
    ending: m.ending ? `${m.ending.numbers.join(",")}${m.ending.start ? "<" : ""}${m.ending.stop ? ">" : ""}${m.ending.open ? "o" : ""}` : "",
    notes: m.notes.map((n) => [n.offset, n.duration, n.type, n.dots, n.pitch ? `${n.pitch.step}${n.pitch.alter}/${n.pitch.octave}` : "r", !!n.tieStart, !!n.tieStop, n.tuplet ? n.tuplet.actual : 0, n.lyric ?? ""]),
  }));

describe("MusicXML writer", () => {
  it("round-trips an imported score (repeats, endings, triplets, ties, lyrics, tempo)", () => {
    const score = parseMusicXml(parseXml(fixture));
    const again = parseMusicXml(parseXml(scoreToMusicXml(score)));
    expect(essence(again)).toEqual(essence(score));
    expect(again.title).toBe(score.title);
    expect(again.tempo).toBe(score.tempo);
    expect(again.measures[6].tempos).toEqual(score.measures[6].tempos);
    expect(playOrder(again)).toEqual(playOrder(score));
  });

  it("round-trips a generated melody in 10/8 (grouping and quarter-tones kept)", () => {
    const score = compositionToScore(compose({ maqamId: "rast-mashriqi", iqaId: "samai-thaqil", seed: 9, cycles: 4 }));
    const xml = scoreToMusicXml(score);
    expect(xml).toContain("<beats>3+2+2+3</beats>");
    expect(xml).toContain("<accidental>quarter-flat</accidental>");
    const again = parseMusicXml(parseXml(xml));
    expect(soundingNotes(again).notes.map((n) => n.cents)).toEqual(soundingNotes(score).notes.map((n) => n.cents));
    expect(again.measures[0].time.grouping).toEqual(score.measures[0].time.grouping);
  });

  it("escapes text", () => {
    const xml = scoreToMusicXml({ ...parseMusicXml(parseXml(fixture)), title: `A & B <"C">` });
    expect(xml).toContain("<work-title>A &amp; B &lt;&quot;C&quot;&gt;</work-title>");
  });
});

describe("transcription schema", () => {
  it("is valid for structured outputs: every object closed, every property required", () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const o = node as Record<string, unknown>;
      if (o.type === "object") {
        expect(o.additionalProperties).toBe(false);
        expect(new Set(o.required as string[])).toEqual(new Set(Object.keys(o.properties as object)));
      }
      for (const forbidden of ["minimum", "maximum", "minLength", "maxLength", "multipleOf"]) expect(o).not.toHaveProperty(forbidden);
      Object.values(o).forEach((v) => (Array.isArray(v) ? v.forEach(walk) : walk(v)));
    };
    walk(TRANSCRIPTION_SCHEMA);
  });
});

describe("transcription → score", () => {
  const n = (over: Partial<TranscribedNote>): TranscribedNote => ({
    rest: false, step: "C", alter: 0, octave: 4, duration: "quarter", dots: 0, triplet: false, tie: false, lyric: null, ...over,
  });
  const sample: Transcription = {
    readable: true,
    title: " لمّا بدا ",
    composer: null,
    tempo: 100,
    clef: "treble",
    warnings: ["bar 3: the second note may be B½♭"],
    measures: [
      { time: { beats: 2, beatType: 4 }, repeatStart: false, repeatEnd: false, endings: [], notes: [n({ step: "G", duration: "eighth", lyric: "يا" })] },
      { time: null, repeatStart: true, repeatEnd: false, endings: [], notes: [n({ step: "E", alter: -0.5, duration: "eighth" }), n({ step: "F", duration: "eighth" }), n({ step: "G", tie: true })] },
      { time: null, repeatStart: false, repeatEnd: false, endings: [], notes: [n({ step: "G" }), n({ step: "A", duration: "eighth", triplet: true }), n({ step: "B", alter: -0.5, duration: "eighth", triplet: true }), n({ step: "C", octave: 5, duration: "eighth", triplet: true })] },
      { time: null, repeatStart: false, repeatEnd: true, endings: [1], notes: [n({ step: "D", duration: "half", tie: true })] },
      { time: null, repeatStart: false, repeatEnd: false, endings: [2], notes: [n({ step: "C", duration: "half" })] },
      { time: null, repeatStart: false, repeatEnd: false, endings: [], notes: [] },
    ],
  };
  const score = transcriptionToScore(sample);

  it("builds bars from the note values, with a numbered pickup", () => {
    expect(score.title).toBe("لمّا بدا");
    expect(score.tempo).toBe(100);
    expect(score.measures.map((m) => m.length)).toEqual([TPQ / 2, 2 * TPQ, 2 * TPQ, 2 * TPQ, 2 * TPQ, 2 * TPQ]);
    expect(score.measures.map((m) => m.number)).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(score.measures[5].notes[0].measureRest).toBe(true);
    expect(score.measures[0].notes[0].lyric).toBe("يا");
  });

  it("keeps half-flats exactly", () => {
    const e = score.measures[1].notes[0].pitch!;
    expect([e.step, e.alter, e.cents]).toEqual(["E", -0.5, pitchCents("E", -0.5, 4)]);
  });

  it("links ties across the barline and drops a tie to a different pitch", () => {
    const g = score.measures[1].notes[2];
    const next = score.measures[2].notes[0];
    expect(g.tieStart && next.tieStop).toBe(true);
    expect(next.sourceId).toBe(g.sourceId);
    expect(score.measures[3].notes[0].tieStart).toBeUndefined(); // D tied to C: not a tie
  });

  it("brackets triplets and spans volta endings (the last one open)", () => {
    const trip = score.measures[2].notes.slice(1);
    expect(trip.map((x) => x.duration)).toEqual([320, 320, 320]);
    expect(new Set(trip.map((x) => x.tuplet?.group)).size).toBe(1);
    expect(score.measures[3].ending).toEqual({ numbers: [1], start: true, stop: true });
    expect(score.measures[4].ending).toEqual({ numbers: [2], start: true, stop: true, open: true });
    expect(playOrder(score)).toEqual([0, 1, 2, 3, 1, 2, 4, 5]);
  });

  it("survives the trip to MusicXML and back", () => {
    const again = parseMusicXml(parseXml(scoreToMusicXml(score)));
    expect(essence(again)).toEqual(essence(score));
  });

  it("points to bars whose notes don't add up (pickup and last bar excepted)", () => {
    expect(unevenBars(score)).toEqual([]);
    const short = transcriptionToScore({ ...sample, measures: sample.measures.map((m, i) => (i === 2 ? { ...m, notes: m.notes.slice(0, 3) } : m)) });
    expect(unevenBars(short)).toEqual([{ bar: "2", written: 1.67, expected: 2 }]);
  });

  it("keeps section labels and tempo changes, through MusicXML too", () => {
    const labelled = transcriptionToScore({
      ...sample,
      measures: sample.measures.map((m, i) => ({ ...m, label: i === 1 ? "التسليم" : null, tempo: i === 0 ? 80 : i === 4 ? 132 : null })),
    });
    expect(labelled.tempo).toBe(80);
    expect(labelled.measures[1].label).toBe("التسليم");
    expect(labelled.measures[4].tempos).toEqual([{ offset: 0, bpm: 132 }]);
    const again = parseMusicXml(parseXml(scoreToMusicXml(labelled)));
    expect(again.measures[1].label).toBe("التسليم");
    expect(again.measures[4].tempos).toEqual([{ offset: 0, bpm: 132 }]);
  });

  it("beams 10/8 in samaʿi groups (3+2+2+3 eighths)", () => {
    const sixteenths = (k: number) => Array.from({ length: k }, () => n({ step: "D", duration: "16th" }));
    const bar = transcriptionToScore({
      ...sample,
      measures: [{ time: { beats: 10, beatType: 8 }, repeatStart: false, repeatEnd: false, endings: [], notes: sixteenths(20) }],
    });
    const l = layoutScore(bar, { width: 4000, sp: 10, locale: "en", names: { solfege: false, arabic: false, lyrics: false } });
    // One primary beam per group (6, 4, 4, 6 sixteenths) plus the 16th beams: 2 polygons per group.
    expect(l.systems[0].polygons).toHaveLength(8);
  });

  it("rejects answers that don't have the expected shape", () => {
    expect(() => parseTranscription(`{"readable":true}`)).toThrow();
    expect(parseTranscription(JSON.stringify(sample)).measures).toHaveLength(6);
  });
});
