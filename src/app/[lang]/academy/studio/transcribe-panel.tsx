"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/ui/notice";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { Locale } from "@/lib/music/types";

export type TranscriptionResult = {
  musicxml: string;
  title: string | null;
  warnings: string[];
  model: string;
  usage: { input: number; output: number };
  fileName: string;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

type ErrorCode = keyof Dictionary["studio"]["aiErrors"];

/** Admin tool: photos or a PDF of sheet music → notation, read by Claude on the server. */
type Props = { labels: Dictionary["studio"]; locale: Locale; ready: boolean; onDone: (r: TranscriptionResult) => void };

export function TranscribePanel({ labels, locale, ready, onDone }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<{ code: ErrorCode; detail?: string } | null>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  const valid = (list: File[]) =>
    list.length > 0 &&
    ((list.length === 1 && list[0].type === "application/pdf" && list[0].size <= MAX_PDF_BYTES) ||
      (list.length <= 8 && list.every((f) => IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_BYTES)));

  const start = async () => {
    setError(null);
    if (!valid(files)) {
      setError({ code: "invalid" });
      return;
    }
    setSeconds(0);
    setBusy(true);
    try {
      const body = new FormData();
      for (const f of files) body.append("file", f);
      body.append("locale", locale);
      const res = await fetch("/api/studio/transcribe", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as Partial<TranscriptionResult> & { error?: string; detail?: string };
      if (!res.ok || !data.musicxml) {
        const code = (data.error && data.error in labels.aiErrors ? data.error : "failed") as ErrorCode;
        setError({ code, detail: data.detail });
        return;
      }
      onDone({
        musicxml: data.musicxml,
        title: data.title ?? null,
        warnings: data.warnings ?? [],
        model: data.model ?? "",
        usage: data.usage ?? { input: 0, output: 0 },
        fileName: files[0].name,
      });
      setFiles([]);
    } catch {
      setError({ code: "failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card flex flex-col gap-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 text-base font-semibold text-soft">{labels.aiTitle}</h2>
        <span className="chip chip-teal">{labels.aiAdminOnly}</span>
      </div>
      <p className="m-0 max-w-[720px] text-[13px] leading-[1.8] text-muted">{labels.aiIntro}</p>
      {!ready ? (
        <Notice tone="info">{labels.aiNotConfigured}</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-ghost has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold" aria-disabled={busy}>
              <input
                type="file"
                className="sr-only"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                disabled={busy}
                onChange={(e) => {
                  setError(null);
                  setFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              {labels.aiChoose}
            </label>
            <button type="button" className="btn-gold" onClick={start} disabled={busy || files.length === 0}>
              {busy && <span aria-hidden="true" className="zr-spin inline-block size-4 rounded-full border-2 border-gold-ink/30 border-t-gold-ink" />}
              {labels.aiStart}
            </button>
          </div>
          {files.length > 0 && (
            <p className="m-0 text-[13px] text-soft" dir="auto">
              {files.map((f) => f.name).join(" · ")}
            </p>
          )}
          {busy && (
            <p className="m-0 text-sm text-teal-light" role="status">
              {labels.aiWorking.replace("{s}", String(seconds))}
            </p>
          )}
          {error && (
            <Notice tone="error">
              {labels.aiErrors[error.code]}
              {error.detail ? <span className="mt-1 block text-[13px] opacity-80" dir="auto">{error.detail}</span> : null}
            </Notice>
          )}
        </>
      )}
    </div>
  );
}
