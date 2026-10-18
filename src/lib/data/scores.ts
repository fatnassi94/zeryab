import "server-only";
import { MUSICXML_MIME } from "@/lib/music/score/musicxml-write";
import { createClient } from "@/lib/supabase/server";

/** A song in the club library: a `documents` row of kind 'score' holding MusicXML. */
export type ClubSong = { id: string; title: string; composer: string | null; visibility: string; ai: boolean; createdAt: string };

type Row = { id: string; title: string; author: string | null; visibility: string; source: string | null; created_at: string };

export const toClubSong = (r: Row): ClubSong => ({
  id: r.id,
  title: r.title,
  composer: r.author,
  visibility: r.visibility,
  ai: !!r.source?.startsWith("AI transcription"),
  createdAt: r.created_at,
});

export const CLUB_SONG_COLUMNS = "id, title, author, visibility, source, created_at";

/** Songs the viewer may open (RLS decides: public, members-only, or everything for librarians). */
export async function listClubSongs(): Promise<ClubSong[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(CLUB_SONG_COLUMNS)
    .eq("kind", "score")
    .eq("mime_type", MUSICXML_MIME)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(300);
  return (data ?? []).map(toClubSong);
}
