"use client";

import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ClubSong } from "@/lib/data/scores";
import { MAQAMAT } from "@/lib/music/maqam/data/maqamat";
import type { Locale } from "@/lib/music/types";

type Props = {
  labels: Dictionary["studio"];
  locale: Locale;
  songs: ClubSong[];
  canManage: boolean;
  currentId: string | null;
  busy: boolean;
  /** Development + admin: transcriptions waiting in score-inbox/. */
  inboxCount: number;
  importMessage: string | null;
  onOpen: (song: ClubSong) => void;
  onPublish: (song: ClubSong) => void;
  onArchive: (song: ClubSong) => void;
  onImport: () => void;
};

// Maqam families in teaching order; their names come from the lab's maqam data.
const FAMILY_ORDER = MAQAMAT.map((m) => m.maqam);
const familyName = (slug: string, locale: Locale) => MAQAMAT.find((m) => m.maqam === slug)?.names[locale] ?? slug;

/** Songs shared with the club, filed by maqam (what each viewer may open is decided by the database). */
export function ClubPanel({ labels, locale, songs, canManage, currentId, busy, inboxCount, importMessage, onOpen, onPublish, onArchive, onImport }: Props) {
  const groups = new Map<string, ClubSong[]>();
  for (const s of songs) {
    const key = s.maqam ?? "";
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const keys = [...groups.keys()].sort((a, b) => (a ? FAMILY_ORDER.indexOf(a) : 99) - (b ? FAMILY_ORDER.indexOf(b) : 99));

  return (
    <div className="card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold text-soft">{labels.clubLibrary}</h2>
        {inboxCount > 0 && (
          <button type="button" className="btn-ghost min-h-11! px-4! text-sm" onClick={onImport} disabled={busy} title={labels.importHint}>
            {labels.importInbox.replace("{n}", String(inboxCount))}
          </button>
        )}
      </div>
      {inboxCount > 0 && <p className="-mt-2 m-0 text-[13px] text-muted">{labels.importHint}</p>}
      {importMessage && <p className="m-0 text-[13px] text-teal-light" role="status">{importMessage}</p>}
      {songs.length === 0 ? (
        <p className="m-0 text-sm text-muted">{labels.clubEmpty}</p>
      ) : (
        keys.map((key) => (
          <section key={key || "other"} aria-labelledby={`club-${key || "other"}`} className="flex flex-col gap-2">
            <h3 id={`club-${key || "other"}`} className="m-0 font-display text-lg text-gold">
              {key ? labels.maqamHeading.replace("{name}", familyName(key, locale)) : labels.otherMaqam}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {groups.get(key)!.map((s) => (
                <li key={s.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-4 py-2 ${s.id === currentId ? "border-gold/50 bg-gold/8" : "border-line"}`}>
                  <button
                    type="button"
                    className="min-h-11 flex-1 cursor-pointer border-0 bg-transparent p-0 text-start font-medium text-text"
                    aria-current={s.id === currentId ? "true" : undefined}
                    disabled={busy}
                    onClick={() => onOpen(s)}
                  >
                    <bdi>{s.title}</bdi>
                    {s.composer && <span className="ms-2 text-[13px] font-normal text-muted"><bdi>{s.composer}</bdi></span>}
                  </button>
                  {s.ai && <span className="chip chip-teal">{labels.aiBadge}</span>}
                  {canManage && s.status === "draft" && <span className="chip bg-rose/15! text-rose!">{labels.draft}</span>}
                  {canManage && <span className="chip">{s.visibility === "public" ? labels.visibilityPublic : labels.visibilityMembers}</span>}
                  {canManage && s.status === "draft" && (
                    <button type="button" className="btn-gold min-h-11! px-4! text-sm" aria-label={labels.publishLabel.replace("{title}", s.title)} onClick={() => onPublish(s)} disabled={busy}>
                      {labels.publish}
                    </button>
                  )}
                  {canManage && (
                    <button type="button" className="btn-ghost min-h-11! px-4! text-sm" aria-label={labels.archiveLabel.replace("{title}", s.title)} onClick={() => onArchive(s)} disabled={busy}>
                      {labels.archive}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
