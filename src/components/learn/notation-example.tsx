"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ScoreView } from "@/app/[lang]/academy/studio/score-view";
import { Player } from "@/lib/audio/engine";
import { parseNotation } from "@/lib/courses/notation";
import type { TimedHit, TimedNote } from "@/lib/music/composer/timeline";
import { scoreTimeline } from "@/lib/music/score/playback";
import { getIqa } from "@/lib/courses/rhythm";

export type NotationLabels = { play: string; stop: string; withMetronome: string; tempo: string; showNames: string; staffLabel: string; rest: string };

/**
 * Timeline of a notation: the melody, with a one-bar count-in and a click on
 * every beat when the metronome is on, and an iqaʿ under it when given (one
 * cycle per bar).
 */
export function buildTimeline(notation: string, bpm: number, metronome: boolean, iqaId?: string) {
  const score = parseNotation(notation, { tempo: bpm });
  const t = scoreTimeline(score, { quarterBpm: bpm, iqa: iqaId ? getIqa(iqaId) : undefined });
  const time = score.measures[0]?.time ?? { beats: 4, beatType: 4 };
  const beat = (60 / bpm) * (4 / time.beatType);
  const countIn = metronome ? time.beats * beat : 0;
  const melody: TimedNote[] = t.melody.map((n) => ({ ...n, time: n.time + countIn }));
  const percussion: TimedHit[] = t.percussion.map((h) => ({ ...h, time: h.time + countIn }));
  if (metronome) {
    const total = countIn + t.duration;
    for (let i = 0; i * beat < total - 1e-6; i++) {
      const first = i % time.beats === 0;
      // Under an iqaʿ the clicks stay light so the drum strokes are heard.
      percussion.push(iqaId ? { track: "percussion", time: i * beat, stroke: "ka", velocity: first ? 0.45 : 0.3 } : { track: "percussion", time: i * beat, stroke: first ? "tak" : "ka", velocity: first ? 0.9 : 0.7 });
    }
  }
  percussion.sort((a, b) => a.time - b.time);
  return { score, timeline: { melody, drone: [], percussion, duration: countIn + t.duration } };
}

/** A staff example from a lesson: read it, play it, play it with the metronome, hide the names to test yourself. */
export function NotationExample({ notation, caption, names = false, toggleNames = false, tempo = 80, playable = true, size = "large", iqa, labels }: {
  notation: string;
  iqa?: string;
  caption?: string;
  names?: boolean;
  toggleNames?: boolean;
  tempo?: number;
  playable?: boolean;
  size?: "normal" | "large";
  labels: NotationLabels;
}) {
  const [showNames, setShowNames] = useState(names);
  const [metronome, setMetronome] = useState(false);
  const [bpm, setBpm] = useState(tempo);
  const playerRef = useRef<Player | null>(null);
  const player = () => (playerRef.current ??= new Player());
  const playing = useSyncExternalStore((fn) => player().subscribe(fn), () => playerRef.current?.state === "playing", () => false);
  const built = useMemo(() => buildTimeline(notation, bpm, metronome, iqa), [notation, bpm, metronome, iqa]);
  const nameOptions = useMemo(() => ({ solfege: showNames, arabic: false, lyrics: false }), [showNames]);

  useEffect(() => () => playerRef.current?.stop(), []);
  // A changed setting stops the sound, so what plays always matches what is shown.
  useEffect(() => () => playerRef.current?.stop(), [built]);

  const melodyRef = useRef(built.timeline.melody);
  useEffect(() => { melodyRef.current = built.timeline.melody; }, [built]);
  const getPlayback = useCallback(() => {
    const p = playerRef.current;
    if (!p || p.state !== "playing") return { id: null, progress: 0 };
    const t = p.position;
    const n = melodyRef.current.find((e) => t >= e.time && t < e.time + e.duration);
    return n ? { id: n.noteId ?? null, progress: (t - n.time) / n.duration } : { id: null, progress: 0 };
  }, []);

  const toggle = () => (playing ? player().stop() : void player().play(built.timeline));

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="rounded-[22px] bg-ivory px-2 py-3 sm:px-4">
        <ScoreView score={built.score} locale="ar" names={nameOptions} label={caption ?? labels.staffLabel} restLabel={labels.rest}
          playing={playing} getPlayback={getPlayback} size={size} />
      </div>
      {(caption || playable || toggleNames) && (
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          {playable && (
            <button type="button" onClick={toggle} aria-pressed={playing} className={playing ? "btn-ghost min-h-10! px-4!" : "btn-gold min-h-10! px-4!"}>
              {playing ? labels.stop : labels.play}
            </button>
          )}
          {caption && <span className="text-[15px] text-soft">{caption}</span>}
          {playable && (
            <span className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <label className="flex min-h-10 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={metronome} onChange={(e) => setMetronome(e.target.checked)} className="size-4 accent-[var(--color-gold)]" />
                {labels.withMetronome}
              </label>
              <label className="flex items-center gap-2">
                <span>{labels.tempo}</span>
                <input type="range" min={40} max={160} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-24 accent-[var(--color-gold)]" />
                <span className="w-8 tabular-nums">{bpm}</span>
              </label>
              {toggleNames && (
                <label className="flex min-h-10 cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} className="size-4 accent-[var(--color-gold)]" />
                  {labels.showNames}
                </label>
              )}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
