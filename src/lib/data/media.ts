import "server-only";
import { createClient } from "@/lib/supabase/server";

type Stored = { storage_bucket: string; storage_path: string };

/**
 * Playable / downloadable URL for a stored file. Private files get a
 * short-lived signed URL, which Storage only issues if RLS allows the viewer.
 */
export async function mediaUrls<T extends Stored>(rows: T[], expiresIn = 60 * 60) {
  const supabase = await createClient();
  const urls = new Map<string, string>();

  const privatePaths = rows.filter((r) => r.storage_bucket === "media-private").map((r) => r.storage_path);
  if (privatePaths.length) {
    const { data } = await supabase.storage.from("media-private").createSignedUrls(privatePaths, expiresIn);
    for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  for (const r of rows) {
    if (r.storage_bucket !== "media-private") {
      urls.set(r.storage_path, supabase.storage.from(r.storage_bucket).getPublicUrl(r.storage_path).data.publicUrl);
    }
  }
  return urls;
}

export function formatDuration(seconds: number | null) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}
