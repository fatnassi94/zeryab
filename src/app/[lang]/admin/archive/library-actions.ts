"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import {
  AUDIO_TYPES, DOCUMENT_TYPES, isUploadPath, LIBRARY_STATUSES, MAX_FILE_BYTES, parseDocument, parseRecording,
  type LibraryField, type LibraryKind,
} from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "media-private";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LibraryState = { status: "idle" | "saved" | "error" | "fields" | "file"; errors?: Partial<Record<LibraryField, true>> };

const refresh = () => {
  revalidatePath("/[lang]/admin/archive", "layout");
  revalidatePath("/[lang]/library", "page");
  revalidatePath("/[lang]/members", "page");
};
const kindOf = (v: FormDataEntryValue | null): LibraryKind | null => (v === "recordings" || v === "documents" ? v : null);

/**
 * Records a file the browser has just uploaded: checks the path, reads the
 * real size and type from storage (not from the browser), then saves the row.
 * The file is removed again if the row can't be saved.
 */
export async function createLibraryItem(formData: FormData): Promise<LibraryState> {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return { status: "error" };
  const kind = kindOf(formData.get("kind"));
  const path = String(formData.get("path") ?? "");
  if (!kind || !isUploadPath(kind, path)) return { status: "file" };

  const supabase = await createClient();
  const dir = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: found } = await supabase.storage.from(BUCKET).list(dir, { search: name, limit: 1 });
  const object = found?.find((o) => o.name === name);
  const size = Number(object?.metadata?.size ?? 0);
  const mime = String(object?.metadata?.mimetype ?? "");
  const types = kind === "recordings" ? AUDIO_TYPES : DOCUMENT_TYPES;
  if (!object || !types[mime] || size <= 0 || size > MAX_FILE_BYTES) {
    if (object) await supabase.storage.from(BUCKET).remove([path]);
    return { status: "file" };
  }

  const get = (k: string) => String(formData.get(k) ?? "");
  const file = { storage_bucket: BUCKET, storage_path: path, mime_type: mime, size_bytes: size, uploaded_by: viewer.id };
  let error: { message: string } | null = null;
  if (kind === "recordings") {
    const parsed = parseRecording(get);
    if ("errors" in parsed) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { status: "fields", errors: parsed.errors };
    }
    const duration = Math.round(Number(get("duration")));
    ({ error } = await supabase.from("recordings").insert({ ...parsed.meta, ...file, duration_seconds: duration > 0 && duration < 86400 ? duration : null }));
  } else {
    const parsed = parseDocument(get);
    if ("errors" in parsed) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { status: "fields", errors: parsed.errors };
    }
    ({ error } = await supabase.from("documents").insert({ ...parsed.meta, ...file }));
  }
  if (error) {
    console.error(`[library] ${kind} insert failed:`, error.message);
    await supabase.storage.from(BUCKET).remove([path]);
    return { status: "error" };
  }
  refresh();
  return { status: "saved" };
}

/** Saves the details of an item (the file itself stays). */
export async function updateLibraryItem(_prev: LibraryState, formData: FormData): Promise<LibraryState> {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return { status: "error" };
  const kind = kindOf(formData.get("kind"));
  const id = String(formData.get("id") ?? "");
  if (!kind || !UUID.test(id)) return { status: "error" };
  const get = (k: string) => String(formData.get(k) ?? "");
  const supabase = await createClient();
  let error: { message: string } | null = null;
  if (kind === "recordings") {
    const parsed = parseRecording(get);
    if ("errors" in parsed) return { status: "fields", errors: parsed.errors };
    ({ error } = await supabase.from("recordings").update(parsed.meta).eq("id", id));
  } else {
    const parsed = parseDocument(get);
    if ("errors" in parsed) return { status: "fields", errors: parsed.errors };
    ({ error } = await supabase.from("documents").update(parsed.meta).eq("id", id));
  }
  if (error) {
    console.error(`[library] ${kind} update failed:`, error.message);
    return { status: "error" };
  }
  refresh();
  return { status: "saved" };
}

/** Publishes, hides (draft) or archives an item. */
export async function setLibraryStatus(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return;
  const kind = kindOf(formData.get("kind"));
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof LIBRARY_STATUSES)[number];
  if (!kind || !UUID.test(id) || !LIBRARY_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from(kind).update({ status }).eq("id", id);
  refresh();
}

/** Deletes an item and its file (the deletion is kept in the audit log). */
export async function deleteLibraryItem(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return;
  const kind = kindOf(formData.get("kind"));
  const id = String(formData.get("id") ?? "");
  if (!kind || !UUID.test(id)) return;
  const supabase = await createClient();
  const { data: row } = await supabase.from(kind).select("storage_bucket, storage_path").eq("id", id).maybeSingle();
  if (!row) return;
  const { error } = await supabase.from(kind).delete().eq("id", id);
  if (error) return;
  await supabase.storage.from(row.storage_bucket).remove([row.storage_path]);
  refresh();
}
