"use server";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getViewer } from "@/lib/auth";
import { basePath, CLUB_SONG_COLUMNS, listClubSongs, ORIGINAL_MIMES, toClubSong, type ClubSong } from "@/lib/data/scores";
import { parseTranscription, transcriptionToScore } from "@/lib/music/score/ai-transcription";
import { MUSICXML_MIME, scoreToMusicXml } from "@/lib/music/score/musicxml-write";
import { createClient } from "@/lib/supabase/server";

const MAX_XML_CHARS = 3_000_000;
const MAX_ORIGINAL_BYTES = 3_500_000; // under the Server Action body limit (4 MB)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const originalPaths = (base: string) => Object.values(EXT).map((ext) => `${base}.${ext}`).concat(`${base}.jpeg`);

type Failure = { ok: false; error: "forbidden" | "invalid" | "failed" | "unavailable" };

/**
 * Staff (librarian, admin) add a song to the club library: the MusicXML (and
 * optionally the original sheet) go to media-private, the rows to `documents`
 * (kind 'score'). Storage and table policies check the same roles; a failed
 * insert removes what was uploaded.
 */
export async function saveClubSong(form: FormData): Promise<{ ok: true; song: ClubSong } | Failure> {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return { ok: false, error: "forbidden" };
  const field = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  const title = field("title").trim().slice(0, 200);
  const musicxml = field("musicxml");
  const visibility = field("visibility");
  const maqamId = field("maqamId");
  const original = form.get("original");
  if (!title || musicxml.length > MAX_XML_CHARS || !/<score-partwise[\s>]/.test(musicxml)) return { ok: false, error: "invalid" };
  if (visibility !== "members" && visibility !== "public") return { ok: false, error: "invalid" };
  if (maqamId && !UUID.test(maqamId)) return { ok: false, error: "invalid" };
  const file = original instanceof File && original.size > 0 ? original : null;
  if (file && (!EXT[file.type] || file.size > MAX_ORIGINAL_BYTES)) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const base = `scores/${new Date().getUTCFullYear()}/${crypto.randomUUID()}`;
  const aiModel = field("aiModel").slice(0, 60);
  const common = {
    title,
    kind: "score" as const,
    author: field("composer").trim().slice(0, 200) || null,
    storage_bucket: "media-private",
    maqam_id: maqamId || null,
    source: aiModel ? `AI transcription by Claude (${aiModel}), to check against the original score` : "Score file added in the Maqam lab",
    rights: field("rights").trim().slice(0, 500) || null,
    visibility: visibility as "members" | "public",
    status: "published" as const,
    uploaded_by: viewer.id,
  };

  const xml = new Blob([musicxml], { type: MUSICXML_MIME });
  const uploaded: string[] = [];
  const undo = async () => {
    if (uploaded.length) await supabase.storage.from("media-private").remove(uploaded);
  };
  const { error: xmlError } = await supabase.storage.from("media-private").upload(`${base}.musicxml`, xml, { contentType: MUSICXML_MIME });
  if (xmlError) return { ok: false, error: "failed" };
  uploaded.push(`${base}.musicxml`);
  if (file) {
    const { error } = await supabase.storage.from("media-private").upload(`${base}.${EXT[file.type]}`, file, { contentType: file.type });
    if (error) {
      await undo();
      return { ok: false, error: "failed" };
    }
    uploaded.push(`${base}.${EXT[file.type]}`);
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({ ...common, storage_path: `${base}.musicxml`, mime_type: MUSICXML_MIME, size_bytes: xml.size })
    .select(CLUB_SONG_COLUMNS)
    .single();
  if (error || !data) {
    await undo();
    return { ok: false, error: "failed" };
  }
  if (file) {
    await supabase.from("documents").insert({ ...common, storage_path: `${base}.${EXT[file.type]}`, mime_type: file.type, size_bytes: file.size });
  }
  return { ok: true, song: toClubSong(data as never, !!file) };
}

/** MusicXML of a club song, plus a short-lived link to its original sheet; Storage and RLS decide access. */
export async function loadClubSong(id: string): Promise<{ ok: true; musicxml: string; original?: { url: string; type: string } } | { ok: false }> {
  if (!UUID.test(id)) return { ok: false };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_bucket, storage_path").eq("id", id).eq("kind", "score").maybeSingle();
  if (!doc) return { ok: false };
  const { data: file } = await supabase.storage.from(doc.storage_bucket).download(doc.storage_path);
  if (!file) return { ok: false };
  const { data: orig } = await supabase
    .from("documents")
    .select("storage_bucket, storage_path, mime_type")
    .in("storage_path", originalPaths(basePath(doc.storage_path)))
    .in("mime_type", ORIGINAL_MIMES)
    .limit(1)
    .maybeSingle();
  let original: { url: string; type: string } | undefined;
  if (orig) {
    const { data: signed } = await supabase.storage.from(orig.storage_bucket).createSignedUrl(orig.storage_path, 60 * 60);
    if (signed?.signedUrl) original = { url: signed.signedUrl, type: orig.mime_type ?? "application/pdf" };
  }
  return { ok: true, musicxml: await file.text(), original };
}

async function setStatus(id: string, status: "published" | "archived"): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  if (!viewer?.has("librarian") || !UUID.test(id)) return { ok: false };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", id).eq("kind", "score").maybeSingle();
  if (!doc) return { ok: false };
  const paths = [doc.storage_path, ...originalPaths(basePath(doc.storage_path))];
  const { error } = await supabase.from("documents").update({ status }).eq("kind", "score").in("storage_path", paths);
  return { ok: !error };
}

/** Make a draft visible to the members (or everyone, per its visibility). */
export const publishClubSong = async (id: string) => setStatus(id, "published");

/** Remove from the library by archiving (history is kept, as for other documents). */
export const archiveClubSong = async (id: string) => setStatus(id, "archived");

const slugOf = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "song";

/**
 * Development only, admins only: add the transcriptions waiting in
 * `score-inbox/` (one JSON per song, written in Claude Code) to the club
 * library as drafts, with their original PDF. Running it again updates the
 * same songs (fixed paths under scores/inbox/), keeping their status.
 */
export async function importScoreInbox(): Promise<{ ok: true; added: number; updated: number; problems: string[]; songs: ClubSong[] } | Failure> {
  if (process.env.NODE_ENV !== "development") return { ok: false, error: "unavailable" };
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "forbidden" };
  const dir = path.join(process.cwd(), "score-inbox");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return { ok: false, error: "unavailable" };
  }

  const supabase = await createClient();
  const { data: maqamat } = await supabase.from("maqamat").select("id, slug");
  const maqamId = (slug?: string) => maqamat?.find((m) => m.slug === slug)?.id ?? null;
  let added = 0;
  let updated = 0;
  const problems: string[] = [];

  for (const file of files) {
    try {
      const text = await readFile(path.join(dir, file), "utf8");
      const meta = (JSON.parse(text) as { meta?: Record<string, unknown> }).meta;
      if (!meta || typeof meta.title !== "string") continue; // not an inbox transcription
      const transcription = parseTranscription(text);
      const score = transcriptionToScore(transcription);
      const title = meta.title.slice(0, 200);
      const composer = typeof meta.composer === "string" ? meta.composer.slice(0, 200) : null;
      const musicxml = scoreToMusicXml({ ...score, title, composer: composer ?? undefined });
      const base = `scores/inbox/${slugOf(file)}`;
      const notes = [...transcription.warnings, ...(meta.maqamInferred ? ["Maqam inferred from the notes (not printed on the score)."] : [])];
      const fields = {
        title,
        kind: "score" as const,
        author: composer,
        storage_bucket: "media-private",
        maqam_id: maqamId(typeof meta.maqam === "string" ? meta.maqam : undefined),
        source: `Transcribed with Claude (Claude Code) from the PDF score; check against the original. ${typeof meta.source === "string" ? meta.source : ""}`.trim(),
        rights: typeof meta.rights === "string" ? meta.rights.slice(0, 500) : null,
        description: notes.join(" ").slice(0, 2000) || null,
      };

      const put = async (storagePath: string, body: Blob, mime: string) => {
        const { error } = await supabase.storage.from("media-private").upload(storagePath, body, { contentType: mime, upsert: true });
        if (error) throw new Error(`${file}: upload failed (${error.message})`);
        const { data: existing } = await supabase.from("documents").select("id").eq("storage_path", storagePath).maybeSingle();
        const row = { ...fields, storage_path: storagePath, mime_type: mime, size_bytes: body.size };
        const { error: dbError } = existing
          ? await supabase.from("documents").update(row).eq("id", existing.id)
          : await supabase.from("documents").insert({ ...row, status: "draft", visibility: "members", uploaded_by: viewer.id });
        if (dbError) throw new Error(`${file}: ${dbError.message}`);
        return !!existing;
      };

      const wasThere = await put(`${base}.musicxml`, new Blob([musicxml], { type: MUSICXML_MIME }), MUSICXML_MIME);
      if (typeof meta.original === "string") {
        const ext = path.extname(meta.original).toLowerCase();
        const mime = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[ext];
        if (mime) {
          const bytes = await readFile(path.join(dir, path.basename(meta.original)));
          await put(`${base}.${EXT[mime]}`, new Blob([bytes], { type: mime }), mime);
        }
      }
      if (wasThere) updated++;
      else added++;
    } catch (e) {
      problems.push(e instanceof Error ? e.message : `${file}: unreadable`);
    }
  }
  return { ok: true, added, updated, problems, songs: await listClubSongs() };
}
