"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Player } from "@/lib/audio/engine";
import { countLabels, cycleOf, cycleTimeline, getIqa, pulseAt, type Cycle } from "@/lib/courses/rhythm";

export type IqaLabels = { play: string; stop: string; tempo: string; withMetronome: string; dum: string; tak: string; ka: string; silence: string; cycleLabel: string };

const CELL: Record<string, string> = {
  D: "bg-gold text-gold-ink border-gold",
  T: "border-teal-light text-teal-light bg-teal/15",
  K: "border-white/25 text-soft bg-white/5",
  ".": "border-white/8 text-muted",
  "?": "border-dashed border-gold/70 text-gold",
};

/** The pulses of a cycle, right to left, grouped (3+2+2+3…) when the cycle is taught that way. */
export function IqaGrid({ cycle, active = -1, marks, labels, compact = false }: {
  cycle: Cycle; active?: number; marks?: (boolean | null)[]; labels: Pick<IqaLabels, "dum" | "tak" | "ka" | "silence" | "cycleLabel">; compact?: boolean;
}) {
  const cells = cycle.skeleton.split(" ");
  const counts = countLabels(cycle);
  // Groups wrap as whole blocks on narrow screens: the taught grouping (3+2+2+3), else halves of 4.
  const sizes = cycle.grouping ?? (cells.length % 4 === 0 && cells.length > 4 ? Array(cells.length / 4).fill(4) : [cells.length]);
  const groups = sizes.reduce<number[][]>((out, g) => {
    const start = out.flat().length;
    return [...out, Array.from({ length: g }, (_, k) => start + k)];
  }, []);
  const name: Record<string, string> = { D: labels.dum, T: labels.tak, K: labels.ka, ".": labels.silence, "?": "؟" };
  const cell = (c: string, i: number) => (
    <li key={i} className="flex flex-col items-center gap-1">
      <span
        aria-label={name[c]}
        className={`grid place-items-center rounded-2xl border-2 font-semibold transition-transform duration-75 ${compact ? "size-10 text-[13px]" : "size-11 text-sm sm:size-14"} ${CELL[c] ?? CELL["."]} ${
          active === i ? "scale-115 ring-2 ring-ivory" : ""
        } ${marks?.[i] === false ? "opacity-45" : ""}`}
      >
        {c === "." ? "·" : name[c]}
      </span>
      {marks ? (
        <span className={`h-4 text-[13px] font-bold ${marks[i] ? "text-teal-light" : "text-rose"}`}>{marks[i] === true ? "✓" : marks[i] === false ? "✗" : ""}</span>
      ) : (
        !compact && <span className={`text-[12px] ${active === i ? "text-gold" : "text-muted"}`}>{counts[i]}</span>
      )}
    </li>
  );
  return (
    <ol dir="rtl" aria-label={labels.cycleLabel} className={`m-0 flex list-none flex-wrap justify-center p-0 ${cycle.grouping ? "gap-x-4 gap-y-2" : "gap-x-1.5 gap-y-2"}`}>
      {groups.map((g, gi) => (
        <li key={gi}>
          <ol className="m-0 flex list-none gap-1.5 p-0">{g.map((i) => cell(cells[i], i))}</ol>
        </li>
      ))}
    </ol>
  );
}

/** Plays a cycle (loops) with the sounding pulse lit; optional quarter-note clicks. */
export function IqaPlayer({ iqa: id, caption, tempo, labels }: { iqa: string; caption?: string; tempo?: number; labels: IqaLabels }) {
  const iqa = getIqa(id);
  const [bpm, setBpm] = useState(tempo ?? 90);
  const [clicks, setClicks] = useState(false);
  const [active, setActive] = useState(-1);
  const playerRef = useRef<Player | null>(null);
  const player = () => (playerRef.current ??= new Player());
  const playing = useSyncExternalStore((fn) => player().subscribe(fn), () => playerRef.current?.state === "playing", () => false);
  const cycle = useMemo(() => (iqa ? cycleOf(iqa) : null), [iqa]);
  const built = useMemo(() => (cycle ? cycleTimeline(cycle, { quarterBpm: bpm, cycles: 32, clicks }) : null), [cycle, bpm, clicks]);

  useEffect(() => () => playerRef.current?.stop(), []);
  useEffect(() => () => playerRef.current?.stop(), [built]);
  useEffect(() => {
    if (!playing || !built) return;
    let raf = 0;
    let last = -2;
    const loop = () => {
      const p = pulseAt(playerRef.current?.position ?? 0, built);
      if (p !== last) setActive((last = p));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      setActive(-1);
    };
  }, [playing, built]);

  if (!iqa || !cycle || !built) return null;
  const toggle = () => (playing ? player().stop() : void player().play({ melody: [], drone: [], percussion: built.hits, duration: built.duration }));

  return (
    <figure className="m-0 flex flex-col gap-4 rounded-[22px] border border-gold/20 bg-white/3 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-xl font-semibold text-gold">{iqa.names.ar}</span>
        <span className="text-sm text-muted" dir="ltr">{iqa.meter}</span>
      </div>
      <IqaGrid cycle={cycle} active={active} labels={labels} />
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <button type="button" onClick={toggle} aria-pressed={playing} className={playing ? "btn-ghost min-h-10! px-4!" : "btn-gold min-h-10! px-4!"}>
          {playing ? labels.stop : labels.play}
        </button>
        {caption && <span className="text-[15px] text-soft">{caption}</span>}
        <span className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <label className="flex min-h-10 cursor-pointer items-center gap-2">
            <input type="checkbox" checked={clicks} onChange={(e) => setClicks(e.target.checked)} className="size-4 accent-[var(--color-gold)]" />
            {labels.withMetronome}
          </label>
          <label className="flex items-center gap-2">
            <span>{labels.tempo}</span>
            <input type="range" min={50} max={160} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-24 accent-[var(--color-gold)]" />
            <span className="w-8 tabular-nums">{bpm}</span>
          </label>
        </span>
      </figcaption>
    </figure>
  );
}

/** The three strokes, one button each. */
export function StrokeDemo({ labels }: { labels: Pick<IqaLabels, "dum" | "tak" | "ka"> }) {
  const playerRef = useRef<Player | null>(null);
  useEffect(() => () => playerRef.current?.stop(), []);
  const strike = (skeleton: string) => {
    const t = cycleTimeline({ skeleton, pulseUnit: 4 }, { quarterBpm: 60, cycles: 1 });
    void (playerRef.current ??= new Player()).play({ melody: [], drone: [], percussion: t.hits, duration: t.duration });
  };
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {([["D", labels.dum, "bg-gold text-gold-ink"], ["T", labels.tak, "border-2 border-teal-light text-teal-light"], ["K", labels.ka, "border-2 border-white/25 text-soft"]] as const).map(([code, label, cls]) => (
        <button key={code} type="button" onClick={() => strike(code)} className={`grid size-24 place-items-center rounded-full font-display text-2xl font-semibold ${cls}`}>
          <span>{label}</span>
          <span className="-mt-3 text-[12px] font-normal opacity-80" dir="ltr">{code}</span>
        </button>
      ))}
    </div>
  );
}

/** Plays two cycles of an iqaʿ without showing it (test questions by ear). */
export function IqaListen({ iqa: id, labels }: { iqa: string; labels: Pick<IqaLabels, "play" | "stop"> }) {
  const playerRef = useRef<Player | null>(null);
  const player = () => (playerRef.current ??= new Player());
  const playing = useSyncExternalStore((fn) => player().subscribe(fn), () => playerRef.current?.state === "playing", () => false);
  useEffect(() => () => playerRef.current?.stop(), []);
  const iqa = getIqa(id);
  if (!iqa) return null;
  const toggle = () => {
    if (playing) return player().stop();
    const t = cycleTimeline(cycleOf(iqa), { quarterBpm: 90, cycles: 2 });
    void player().play({ melody: [], drone: [], percussion: t.hits, duration: t.duration });
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={playing} className={`self-start ${playing ? "btn-ghost" : "btn-gold"}`}>
      {playing ? labels.stop : labels.play}
    </button>
  );
}
