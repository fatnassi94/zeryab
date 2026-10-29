/**
 * Library uploads (recordings and documents): which files are accepted, where
 * they are stored, and the checks on their details. Files always go to the
 * private bucket; who may open them is decided by the row's visibility and
 * status (private.can_read_private_object), so "public" needs no file move.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // the bucket's own limit

export const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav", "audio/flac": "flac", "audio/webm": "webm",
};
export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

export const DOCUMENT_KINDS = ["score", "lyrics", "program", "photo", "article", "study", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export const LIBRARY_VISIBILITY = ["members", "public"] as const;
export const LIBRARY_STATUSES = ["draft", "published", "archived"] as const;
export type LibraryKind = "recordings" | "documents";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Why a chosen file is refused, or null. */
export function fileProblem(kind: LibraryKind, type: string, size: number): "type" | "size" | "empty" | null {
  const types = kind === "recordings" ? AUDIO_TYPES : DOCUMENT_TYPES;
  if (!types[type]) return "type";
  if (size <= 0) return "empty";
  if (size > MAX_FILE_BYTES) return "size";
  return null;
}

/** Storage path of a new upload: recordings/2026/<uuid>.mp3 */
export function storagePath(kind: LibraryKind, type: string, id: string, year: number) {
  const ext = (kind === "recordings" ? AUDIO_TYPES : DOCUMENT_TYPES)[type];
  return `${kind}/${year}/${id}.${ext}`;
}

/** A path made by storagePath for this kind (the server only accepts those). */
export function isUploadPath(kind: LibraryKind, path: string) {
  const exts = [...new Set(Object.values(kind === "recordings" ? AUDIO_TYPES : DOCUMENT_TYPES))].join("|");
  return new RegExp(`^${kind}/\\d{4}/${UUID}\\.(${exts})$`).test(path);
}

export type LibraryField =
  | "title" | "description" | "performers" | "composer" | "author" | "date" | "kind" | "maqam" | "visibility" | "status" | "source" | "rights";

type Common = {
  title: string; description: string | null; visibility: (typeof LIBRARY_VISIBILITY)[number];
  status: (typeof LIBRARY_STATUSES)[number]; source: string | null; rights: string | null;
};
export type RecordingMeta = Common & { performers: string | null; composer: string | null; recorded_on: string | null; maqam_id: string | null };
export type DocumentMeta = Common & { kind: DocumentKind; author: string | null; document_date: string | null };

function common(get: (k: string) => string, errors: Partial<Record<LibraryField, true>>): Common {
  const text = (k: LibraryField, max: number, min = 0) => {
    const v = get(k).replace(/\s+/g, " ").trim();
    if (v.length < min || v.length > max) errors[k] = true;
    return v || null;
  };
  const description = get("description").trim();
  if (description.length > 4000) errors.description = true;
  const visibility = get("visibility") as Common["visibility"];
  if (!LIBRARY_VISIBILITY.includes(visibility)) errors.visibility = true;
  const status = get("status") as Common["status"];
  if (!LIBRARY_STATUSES.includes(status)) errors.status = true;
  return { title: text("title", 160, 2) ?? "", description: description || null, visibility, status, source: text("source", 300), rights: text("rights", 300) };
}

function date(v: string, errors: Partial<Record<LibraryField, true>>) {
  if (!v) return null;
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!ok) errors.date = true;
  return ok ? v : null;
}

export function parseRecording(get: (k: string) => string): { meta: RecordingMeta } | { errors: Partial<Record<LibraryField, true>> } {
  const errors: Partial<Record<LibraryField, true>> = {};
  const base = common(get, errors);
  const short = (k: LibraryField) => {
    const v = get(k).replace(/\s+/g, " ").trim();
    if (v.length > 200) errors[k] = true;
    return v || null;
  };
  const maqam = get("maqam").trim();
  if (maqam && !new RegExp(`^${UUID}$`).test(maqam)) errors.maqam = true;
  const meta = { ...base, performers: short("performers"), composer: short("composer"), recorded_on: date(get("date").trim(), errors), maqam_id: maqam || null };
  return Object.keys(errors).length ? { errors } : { meta };
}

export function parseDocument(get: (k: string) => string): { meta: DocumentMeta } | { errors: Partial<Record<LibraryField, true>> } {
  const errors: Partial<Record<LibraryField, true>> = {};
  const base = common(get, errors);
  const kind = get("kind") as DocumentKind;
  if (!DOCUMENT_KINDS.includes(kind)) errors.kind = true;
  const author = get("author").replace(/\s+/g, " ").trim();
  if (author.length > 200) errors.author = true;
  const meta = { ...base, kind, author: author || null, document_date: date(get("date").trim(), errors) };
  return Object.keys(errors).length ? { errors } : { meta };
}

/** "12.4 MB" style size for lists. */
export const formatBytes = (n: number | null) => (n == null ? "" : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
