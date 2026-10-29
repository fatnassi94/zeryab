"use client";

import { useRef, useState } from "react";
import { Notice } from "@/components/ui/notice";
import { AUDIO_TYPES, DOCUMENT_TYPES, fileProblem, MAX_FILE_BYTES, storagePath, type LibraryField, type LibraryKind } from "@/lib/library";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { createLibraryItem } from "./library-actions";
import { EMPTY_LIBRARY_VALUES, LibraryFields, type LibraryLabels } from "./library-fields";

export type UploadLabels = {
  file: string; fileHint: string; upload: string; uploading: string; saving: string; saved: string; error: string;
  badType: string; tooBig: string; empty: string; noFile: string; fieldError: string;
};

/** Length of an audio file in seconds, read by the browser (0 if it can't tell). */
function audioDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (v: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v) ? v : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    audio.src = url;
  });
}

/**
 * Upload of a recording or document: the file goes straight from the browser to
 * private storage, then the server checks it and saves its details.
 */
export function LibraryUpload({ kind, labels, fieldLabels, maqamat }: {
  kind: LibraryKind; labels: UploadLabels; fieldLabels: LibraryLabels; maqamat: { id: string; name: string }[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Partial<Record<LibraryField, true>>>();
  const [resetKey, setResetKey] = useState(0);
  const busy = phase === "uploading" || phase === "saving";
  const accept = Object.keys(kind === "recordings" ? AUDIO_TYPES : DOCUMENT_TYPES).join(",");

  const fail = (text: string) => {
    setPhase("error");
    setMessage(text);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) return fail(labels.noFile);
    const problem = fileProblem(kind, file.type, file.size);
    if (problem) return fail({ type: labels.badType, size: labels.tooBig, empty: labels.empty }[problem]);
    setErrors(undefined);

    setPhase("uploading");
    const path = storagePath(kind, file.type, crypto.randomUUID(), new Date().getFullYear());
    const supabase = createBrowserSupabase();
    const { error } = await supabase.storage.from("media-private").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return fail(labels.error);

    setPhase("saving");
    data.delete("file");
    data.set("kind", kind);
    data.set("path", path);
    if (kind === "recordings") data.set("duration", String(await audioDuration(file)));
    const r = await createLibraryItem(data);
    if (r.status === "saved") {
      setPhase("saved");
      form.current?.reset();
      setResetKey((k) => k + 1);
      return;
    }
    if (r.status === "fields") {
      setErrors(r.errors);
      return fail(labels.fieldError);
    }
    fail(r.status === "file" ? labels.badType : labels.error);
  }

  return (
    <form ref={form} onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`up-${kind}-file`} className="label">{labels.file}</label>
        <input id={`up-${kind}-file`} name="file" type="file" accept={accept} required disabled={busy}
          className="field cursor-pointer file:me-3 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-1.5 file:font-semibold file:text-gold-ink" />
        <span className="text-[13px] text-muted">{labels.fileHint.replace("{mb}", String(MAX_FILE_BYTES / 1024 / 1024))}</span>
      </div>
      <LibraryFields key={resetKey} kind={kind} idPrefix={`up-${kind}`} values={EMPTY_LIBRARY_VALUES} labels={fieldLabels} maqamat={maqamat} errors={errors} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} aria-busy={busy || undefined} className="btn-gold min-h-[50px]!">
          {phase === "uploading" ? labels.uploading : phase === "saving" ? labels.saving : labels.upload}
        </button>
        <span aria-live="polite">
          {phase === "saved" && <Notice tone="success">{labels.saved}</Notice>}
          {phase === "error" && <Notice tone="error">{message}</Notice>}
        </span>
      </div>
    </form>
  );
}
