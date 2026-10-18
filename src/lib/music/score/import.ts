import { defaultMidiTrack, midiToScore, midiTracks } from "./midi-import";
import { defaultPart, listParts, parseMusicXml, ScoreImportError } from "./musicxml";
import { decodeXml, isZip, readMxl } from "./mxl";
import type { Score } from "./types";

export { ScoreImportError } from "./musicxml";

export type ImportFormat = "musicxml" | "mxl" | "midi";

export type ImportedScore = {
  score: Score;
  format: ImportFormat;
  /** Parts (MusicXML) or melodic tracks (MIDI); `value` is what to pass back as `part`. */
  parts: { value: number; name: string }[];
  part: number;
};

const isMidi = (b: Uint8Array) => b.length > 4 && b[0] === 0x4d && b[1] === 0x54 && b[2] === 0x68 && b[3] === 0x64; // "MThd"

/**
 * Read a score file by its content (not its name): MIDI, compressed MusicXML
 * (.mxl) or plain MusicXML. `parseXml` is the platform's XML parser
 * (DOMParser in the browser).
 */
export async function importScore(bytes: Uint8Array, parseXml: (xml: string) => Document, part?: number): Promise<ImportedScore> {
  if (isMidi(bytes)) {
    const index = part ?? defaultMidiTrack(bytes);
    const parts = midiTracks(bytes).map((t) => ({ value: t.index, name: t.name }));
    return { score: midiToScore(bytes, index), format: "midi", parts, part: index };
  }
  const zip = isZip(bytes);
  const text = decodeXml(zip ? await readMxl(bytes) : bytes);
  if (!/<score-(partwise|timewise)[\s>]/.test(text)) throw new ScoreImportError("format");
  const doc = parseXml(text);
  if (!doc.documentElement || doc.getElementsByTagName("parsererror").length) throw new ScoreImportError("read");
  const index = part ?? defaultPart(doc);
  const parts = listParts(doc).map((p, i) => ({ value: i, name: p.name }));
  return { score: parseMusicXml(doc, index), format: zip ? "mxl" : "musicxml", parts, part: index };
}
