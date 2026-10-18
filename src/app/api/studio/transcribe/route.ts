import { isTranscriptionConfigured, transcribeSheetMusic, TranscriptionError, type SheetFile } from "@/lib/ai/transcribe";
import { getViewer } from "@/lib/auth";
import { transcriptionToScore } from "@/lib/music/score/ai-transcription";
import { scoreToMusicXml } from "@/lib/music/score/musicxml-write";

// Reading a long PDF can take a few minutes.
export const maxDuration = 300;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 8;

const STATUS: Record<TranscriptionError["code"], number> = {
  not_configured: 503, unreadable: 422, refused: 422, too_long: 422, auth: 502, rate_limit: 429, overloaded: 503, failed: 502,
};

const fail = (error: string, status: number, detail?: string) => Response.json({ error, ...(detail ? { detail } : {}) }, { status });

/**
 * Admin only: photos (in page order) or one PDF of sheet music → MusicXML
 * transcribed by Claude. Lives under /api, outside the proxy, so large uploads
 * aren't buffered there; the session cookie still identifies the admin.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return fail("forbidden", 403);

  const viewer = await getViewer();
  if (!viewer?.isAdmin) return fail("forbidden", 403);
  if (!isTranscriptionConfigured()) return fail("not_configured", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid", 400);
  }
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  const onePdf = files.length === 1 && files[0].type === "application/pdf" && files[0].size <= MAX_PDF_BYTES;
  const images = files.length > 0 && files.length <= MAX_IMAGES && files.every((f) => IMAGE_TYPES.has(f.type) && f.size <= MAX_IMAGE_BYTES);
  if (!onePdf && !images) return fail("invalid", 400);

  const sheets: SheetFile[] = await Promise.all(
    files.map(async (f) => ({ mediaType: f.type as SheetFile["mediaType"], base64: Buffer.from(await f.arrayBuffer()).toString("base64") })),
  );
  try {
    const locale = form.get("locale");
    const warningsIn = locale === "ar" || locale === "fr" || locale === "en" ? locale : "en";
    const { transcription, model, usage } = await transcribeSheetMusic(sheets, { warningsIn });
    const score = transcriptionToScore(transcription);
    return Response.json({ musicxml: scoreToMusicXml(score), title: score.title ?? null, warnings: transcription.warnings, model, usage });
  } catch (e) {
    if (e instanceof TranscriptionError) return fail(e.code, STATUS[e.code], e.code === "unreadable" || e.code === "failed" ? e.message : undefined);
    throw e;
  }
}
