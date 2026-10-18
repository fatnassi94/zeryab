/**
 * Bundled by scripts/score-convert.mjs: transcription JSON → MusicXML with the
 * same code the lab uses for Claude API transcriptions.
 */
import { parseTranscription, transcriptionToScore, unevenBars } from "@/lib/music/score/ai-transcription";
import { scoreToMusicXml } from "@/lib/music/score/musicxml-write";

export function convert(json: string) {
  const transcription = parseTranscription(json);
  const score = transcriptionToScore(transcription);
  const notes = score.measures.reduce((sum, m) => sum + m.notes.filter((n) => n.pitch && !n.tieStop).length, 0);
  return {
    musicxml: scoreToMusicXml(score),
    title: score.title ?? null,
    bars: score.measures.length,
    notes,
    uneven: unevenBars(score),
    warnings: transcription.warnings,
  };
}
