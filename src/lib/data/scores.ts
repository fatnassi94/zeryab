import "server-only";
import { MUSICXML_MIME } from "@/lib/music/score/musicxml-write";
import { createClient } from "@/lib/supabase/server";

/**
 * Club song library: `documents` rows of kind 'score' under `scores/`. The
 * playable file is MusicXML; the original sheet (PDF or image), when kept, is
 * a second row with the same path minus the extension.
 */
export type ClubSong = {
  id: string;
  title: string;
  composer: string | null;
  visibility: string;
  status: "draft" | "published";
  ai: boolean;
  /** Maqam slug (rast, bayati…) when the song is filed under one. */
  maqam: string | null;
  hasOriginal: boolean;
  createdAt: string;
};

export type MaqamOption = { id: string; slug: string; name: string };

export const ORIGINAL_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const basePath = (path: string) => path.replace(/\.[^./]+$/, "");

type Row = {
  id: string;
  title: string;
  author: string | null;
  visibility: string;
  status: string;
  source: string | null;
  created_at: string;
  storage_path: string;
  mime_type: string | null;
  maqamat: { slug: string } | null;
};

export const CLUB_SONG_COLUMNS = "id, title, author, visibility, status, source, created_at, storage_path, mime_type, maqamat(slug)";

export const toClubSong = (r: Row, hasOriginal = false): ClubSong => ({
  id: r.id,
  title: r.title,
  composer: r.author,
  visibility: r.visibility,
  status: r.status === "draft" ? "draft" : "published",
  ai: !!r.source && /^(AI transcription|Transcribed with Claude)/.test(r.source),
  maqam: r.maqamat?.slug ?? null,
  hasOriginal,
  createdAt: r.created_at,
});

/** Songs the viewer may open (RLS decides: published public/members songs, everything for librarians), optionally of one maqam. */
export async function listClubSongs(filter: { maqamId?: string } = {}): Promise<ClubSong[]> {
  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select(CLUB_SONG_COLUMNS)
    .eq("kind", "score")
    .like("storage_path", "scores/%")
    .neq("status", "archived");
  if (filter.maqamId) query = query.eq("maqam_id", filter.maqamId);
  const { data } = await query.order("created_at", { ascending: false }).limit(600);
  const rows = (data ?? []) as unknown as Row[];
  const originals = new Set(rows.filter((r) => r.mime_type && ORIGINAL_MIMES.includes(r.mime_type)).map((r) => basePath(r.storage_path)));
  return rows.filter((r) => r.mime_type === MUSICXML_MIME).map((r) => toClubSong(r, originals.has(basePath(r.storage_path))));
}

export async function listMaqamOptions(): Promise<MaqamOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("maqamat").select("id, slug, name").eq("status", "published").order("position");
  return data ?? [];
}
