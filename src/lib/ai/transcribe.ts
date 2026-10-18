import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { parseTranscription, TRANSCRIPTION_SCHEMA, TRANSCRIPTION_SYSTEM, type Transcription } from "@/lib/music/score/ai-transcription";

/**
 * Reads a photo or PDF of sheet music with Claude and returns a structured
 * transcription. Server-only: the API key never leaves the server, and the
 * feature is off (hidden in the UI) while ANTHROPIC_API_KEY is unset.
 */

export const TRANSCRIPTION_MODEL = "claude-opus-5-5";

export type SheetFile = { mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/gif" | "image/webp"; base64: string };

export type TranscriptionErrorCode = "not_configured" | "unreadable" | "refused" | "too_long" | "auth" | "rate_limit" | "overloaded" | "failed";

export class TranscriptionError extends Error {
  constructor(public code: TranscriptionErrorCode, detail?: string) {
    super(detail ?? code);
  }
}

export const isTranscriptionConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

const LANGUAGES = { ar: "Arabic", fr: "French", en: "English" } as const;

export async function transcribeSheetMusic(
  files: SheetFile[],
  opts: { warningsIn?: keyof typeof LANGUAGES } = {},
): Promise<{ transcription: Transcription; model: string; usage: { input: number; output: number } }> {
  if (!isTranscriptionConfigured()) throw new TranscriptionError("not_configured");
  const client = new Anthropic();

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...files.map((f): Anthropic.Beta.BetaContentBlockParam =>
      f.mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 } }
        : { type: "image", source: { type: "base64", media_type: f.mediaType, data: f.base64 } },
    ),
    {
      type: "text",
      text: `${files.length > 1 ? "Transcribe these pages, in this order." : "Transcribe this score."} Write any warnings in ${LANGUAGES[opts.warningsIn ?? "en"]}.`,
    },
  ];

  let message: Anthropic.Beta.BetaMessage;
  try {
    // Streamed so a long answer (many bars) can't hit an HTTP timeout. A safety
    // decline is retried server-side on Anthropic's recommended fallback model.
    const stream = client.beta.messages.stream({
      model: TRANSCRIPTION_MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: TRANSCRIPTION_SYSTEM,
      output_config: { effort: "high", format: { type: "json_schema", schema: TRANSCRIPTION_SCHEMA } },
      messages: [{ role: "user", content }],
    });
    message = await stream.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new TranscriptionError("auth");
    if (e instanceof Anthropic.RateLimitError) throw new TranscriptionError("rate_limit");
    if (e instanceof Anthropic.InternalServerError) throw new TranscriptionError("overloaded");
    if (e instanceof Anthropic.BadRequestError) throw new TranscriptionError("failed", e.message);
    if (e instanceof Anthropic.APIError) throw new TranscriptionError("failed", e.message);
    throw e;
  }

  if (message.stop_reason === "refusal") throw new TranscriptionError("refused");
  if (message.stop_reason === "max_tokens") throw new TranscriptionError("too_long");
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let transcription: Transcription;
  try {
    transcription = parseTranscription(text);
  } catch {
    throw new TranscriptionError("unreadable");
  }
  if (!transcription.readable || !transcription.measures.some((m) => m.notes.some((n) => !n.rest))) {
    throw new TranscriptionError("unreadable", transcription.warnings.join(" "));
  }
  return { transcription, model: message.model, usage: { input: message.usage.input_tokens, output: message.usage.output_tokens } };
}
