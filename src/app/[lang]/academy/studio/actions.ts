"use server";

import { getViewer } from "@/lib/auth";
import { CLUB_SONG_COLUMNS, toClubSong, type ClubSong } from "@/lib/data/scores";
import { MUSICXML_MIME } from "@/lib/music/score/musicxml-write";
import { createClient } from "@/lib/supabase/server";

const MAX_XML_CHARS = 3_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SaveClubSongInput = {
  title: string;
  composer?: string;
  musicxml: string;
  visibility: "members" | "public";
  rights?: string;
  /** Set for transcriptions, so the library records which model wrote them. */
  aiModel?: string;
};

/**
 * Staff (librarian, admin) add a song to the club library: the MusicXML goes
 * to media-private, the row to `documents` (kind 'score'). Storage and table
 * policies check the same roles; a failed insert removes the uploaded file.
 */
export async function saveClubSong(input: SaveClubSongInput): Promise<{ ok: true; song: ClubSong } | { ok: false; error: "forbidden" | "invalid" | "failed" }> {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return { ok: false, error: "forbidden" };
  const title = input.title?.trim().slice(0, 200);
  if (!title || typeof input.musicxml !== "string" || input.musicxml.length > MAX_XML_CHARS || !/<score-partwise[\s>]/.test(input.musicxml)) {
    return { ok: false, error: "invalid" };
  }
  if (input.visibility !== "members" && input.visibility !== "public") return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const path = `scores/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.musicxml`;
  const file = new Blob([input.musicxml], { type: MUSICXML_MIME });
  const { error: uploadError } = await supabase.storage.from("media-private").upload(path, file, { contentType: MUSICXML_MIME, upsert: false });
  if (uploadError) return { ok: false, error: "failed" };

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title,
      kind: "score",
      author: input.composer?.trim().slice(0, 200) || null,
      storage_bucket: "media-private",
      storage_path: path,
      mime_type: MUSICXML_MIME,
      size_bytes: file.size,
      source: input.aiModel ? `AI transcription by Claude (${input.aiModel.slice(0, 60)}), to check against the original score` : "Score file added in the Maqam lab",
      rights: input.rights?.trim().slice(0, 500) || null,
      visibility: input.visibility,
      status: "published",
      uploaded_by: viewer.id,
    })
    .select(CLUB_SONG_COLUMNS)
    .single();
  if (error || !data) {
    await supabase.storage.from("media-private").remove([path]);
    return { ok: false, error: "failed" };
  }
  return { ok: true, song: toClubSong(data) };
}

/** MusicXML of a club song; Storage and RLS only hand it over if the viewer may open it. */
export async function loadClubSong(id: string): Promise<{ ok: true; musicxml: string } | { ok: false }> {
  if (!UUID.test(id)) return { ok: false };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_bucket, storage_path").eq("id", id).eq("kind", "score").maybeSingle();
  if (!doc) return { ok: false };
  const { data: file } = await supabase.storage.from(doc.storage_bucket).download(doc.storage_path);
  return file ? { ok: true, musicxml: await file.text() } : { ok: false };
}

/** Remove from the library by archiving (history is kept, as for other documents). */
export async function archiveClubSong(id: string): Promise<{ ok: boolean }> {
  const viewer = await getViewer();
  if (!viewer?.has("librarian") || !UUID.test(id)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ status: "archived" }).eq("id", id).eq("kind", "score");
  return { ok: !error };
}
