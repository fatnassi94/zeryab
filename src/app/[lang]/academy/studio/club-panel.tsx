"use client";

import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ClubSong } from "@/lib/data/scores";

type Props = {
  labels: Dictionary["studio"];
  songs: ClubSong[];
  canManage: boolean;
  currentId: string | null;
  busy: boolean;
  onOpen: (song: ClubSong) => void;
  onArchive: (song: ClubSong) => void;
};

/** Songs shared with the club (what each viewer may open is decided by the database). */
export function ClubPanel({ labels, songs, canManage, currentId, busy, onOpen, onArchive }: Props) {
  return (
    <div className="card flex flex-col gap-3 p-5 sm:p-6">
      <h2 className="m-0 text-base font-semibold text-soft">{labels.clubLibrary}</h2>
      {songs.length === 0 ? (
        <p className="m-0 text-sm text-muted">{labels.clubEmpty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {songs.map((s) => (
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
              {canManage && <span className="chip">{s.visibility === "public" ? labels.visibilityPublic : labels.visibilityMembers}</span>}
              {canManage && (
                <button type="button" className="btn-ghost min-h-11! px-4! text-sm" aria-label={labels.archiveLabel.replace("{title}", s.title)} onClick={() => onArchive(s)}>
                  {labels.archive}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
