"use client";

import { useEffect, useState, type DragEvent } from "react";
import { Notice } from "@/components/ui/notice";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import { importScore, ScoreImportError, type ImportedScore } from "@/lib/music/score/import";
import { measureTicks, type Score } from "@/lib/music/score/types";
import { deleteSong, listSongs, saveSong, type StoredSong } from "./song-store";

export type LoadedSong = {
  record: StoredSong;
  imported: ImportedScore;
  /** Kept on this device (false when the browser can't store it). */
  saved: boolean;
  /** Opened from the club library. */
  clubId?: string;
  /** Short-lived link to the club song's original sheet (PDF or image). */
  original?: { url: string; type: string };
  /** Transcribed by Claude from a photo or PDF. */
  ai?: { model: string; warnings: string[]; usage: { input: number; output: number } };
};

const MAX_BYTES = 15 * 1024 * 1024;

/** Parse a score file in the browser (DOMParser for XML). */
export function readScoreFile(bytes: ArrayBuffer, part?: number) {
  return importScore(new Uint8Array(bytes), (xml) => new DOMParser().parseFromString(xml, "application/xml"), part);
}

/** Meter of the first complete bar (a pickup bar is shorter than its signature). */
export function meterOf(score: Score): string {
  const m = score.measures.find((x) => x.length === measureTicks(x.time)) ?? score.measures[0];
  return m ? `${m.time.beats}/${m.time.beatType}` : "4/4";
}

type Props = {
  labels: Dictionary["studio"];
  currentId: string | null;
  onLoad: (song: LoadedSong) => void;
  onRemoveCurrent: () => void;
  /** Changes when a song was stored from elsewhere (a transcription), so the list reloads. */
  refreshKey?: number;
};

/** Add a score file (button or drop) and reopen songs saved on this device. */
export function SongPanel({ labels, currentId, onLoad, onRemoveCurrent, refreshKey = 0 }: Props) {
  const [songs, setSongs] = useState<StoredSong[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    listSongs()
      .then(setSongs)
      .catch(() => {
        setSongs([]);
        setStorageOk(false);
      });
  }, [refreshKey]);

  const errorText = (e: unknown) => (e instanceof ScoreImportError && e.code in labels.importErrors ? labels.importErrors[e.code] : labels.importErrors.read);

  const addFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(labels.importErrors.tooBig);
      return;
    }
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      const imported = await readScoreFile(bytes);
      const record: StoredSong = {
        id: crypto.randomUUID(),
        title: imported.score.title?.trim() || file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        format: imported.format,
        bars: imported.score.measures.length,
        meter: meterOf(imported.score),
        addedAt: Date.now(),
        bytes,
      };
      let saved = true;
      try {
        await saveSong(record);
        setSongs((s) => [record, ...(s ?? [])]);
      } catch {
        saved = false;
        setStorageOk(false);
      }
      onLoad({ record, imported, saved });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const open = async (record: StoredSong) => {
    setError(null);
    setBusy(true);
    try {
      onLoad({ record, imported: await readScoreFile(record.bytes), saved: true });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (record: StoredSong) => {
    try {
      await deleteSong(record.id);
    } catch {
      // Not stored (or storage gone): removing it from the list is enough.
    }
    setSongs((s) => s?.filter((x) => x.id !== record.id) ?? null);
    if (record.id === currentId) onRemoveCurrent();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void addFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      className={`card flex flex-col gap-5 p-5 transition-colors sm:p-6 ${dragging ? "border-gold/60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${currentId ? "btn-ghost" : "btn-gold"} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold`} aria-disabled={busy}>
            <input
              type="file"
              className="sr-only"
              accept=".musicxml,.xml,.mxl,.mid,.midi"
              disabled={busy}
              onChange={(e) => {
                void addFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {busy ? labels.reading : labels.addSong}
          </label>
          <span className="text-[13px] text-muted">{labels.dropHint}</span>
        </div>
        <p className="m-0 max-w-[720px] text-[13px] leading-[1.8] text-muted">{labels.addSongHint}</p>
        {error && <Notice tone="error">{error}</Notice>}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-base font-semibold text-soft">{labels.mySongs}</h2>
        {songs === null ? (
          <div className="skeleton h-12" aria-hidden="true" />
        ) : songs.length === 0 ? (
          <p className="m-0 text-sm text-muted">{labels.noSongs}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {songs.map((s) => (
              <li key={s.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-4 py-2 ${s.id === currentId ? "border-gold/50 bg-gold/8" : "border-line"}`}>
                <button type="button" className="min-h-11 flex-1 cursor-pointer border-0 bg-transparent p-0 text-start font-medium text-text" aria-current={s.id === currentId ? "true" : undefined} onClick={() => open(s)} disabled={busy}>
                  <bdi>{s.title}</bdi>
                </button>
                <span className="text-[13px] text-muted" dir="ltr">
                  {s.format === "midi" ? "MIDI" : "MusicXML"} · {s.meter}
                </span>
                <button type="button" className="btn-ghost min-h-11! px-4! text-sm" aria-label={labels.removeSongLabel.replace("{title}", s.title)} onClick={() => remove(s)}>
                  {labels.removeSong}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!storageOk && <p className="m-0 text-[13px] text-muted">{labels.notSaved}</p>}
      </div>
    </div>
  );
}
