"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { completeLesson } from "@/app/[lang]/academy/actions";
import { getAudioContext, Player } from "@/lib/audio/engine";
import { cycleOf, cycleTimeline, getIqa, pulseAt, scoreTaps, type Tap, type TapScore } from "@/lib/courses/rhythm";
import { TAP_CYCLES, TAP_PASS } from "@/lib/courses/rules";
import { IqaGrid, type IqaLabels } from "./iqa";

export type TapLabels = IqaLabels & {
  intro: string; start: string; slow: string; normal: string; guide: string; countIn: string; keys: string;
  result: string; hits: string; passed: string; passedSaved: string; failed: string; retry: string; nextItem: string; signIn: string; alreadyDone: string; cycleN: string;
};

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

/**
 * Tap-along drill: after one bar of clicks the cycle plays TAP_CYCLES times and
 * the learner taps dum and tak (buttons, or keys F and J) in time. Scored on
 * timing; passed from TAP_PASS percent.
 */
export function TapDrill({ iqa: id, lessonId, path, signedIn, done, nextHref, labels }: {
  iqa: string; lessonId: string; path: string; signedIn: boolean; done: boolean; nextHref: string | null; labels: TapLabels;
}) {
  const iqa = getIqa(id);
  const cycle = useMemo(() => (iqa ? cycleOf(iqa) : null), [iqa]);
  const [bpm, setBpm] = useState(70);
  const [guide, setGuide] = useState(true);
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [active, setActive] = useState(-1);
  const [counting, setCounting] = useState(false);
  const [flash, setFlash] = useState<"dum" | "tak" | null>(null);
  const [score, setScore] = useState<TapScore | null>(null);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();
  const playerRef = useRef<Player | null>(null);
  const taps = useRef<Tap[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const built = useMemo(() => (cycle ? cycleTimeline(cycle, { quarterBpm: bpm, cycles: TAP_CYCLES, countIn: true, clicks: true }) : null), [cycle, bpm]);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => stop, [stop]);

  const finish = useCallback(() => {
    if (!built) return;
    stop();
    const result = scoreTaps(built.strokes, taps.current, Math.min(0.13, built.pulse * 0.45));
    setScore(result);
    setPhase("done");
    if (result.percent >= TAP_PASS && signedIn && !done) {
      startTransition(async () => {
        const res = await completeLesson(lessonId, path);
        if (res.ok) setSaved(true);
      });
    }
  }, [built, stop, signedIn, done, lessonId, path]);

  const begin = () => {
    if (!built) return;
    taps.current = [];
    setScore(null);
    setSaved(false);
    setPhase("running");
    // Without the guide only the clicks sound: the learner carries the cycle alone.
    const percussion = guide ? built.hits : built.clickHits;
    const player = (playerRef.current ??= new Player());
    void player.play({ melody: [], drone: [], percussion, duration: built.duration });
    timer.current = setTimeout(finish, (built.duration + 0.5) * 1000);
  };

  // Where the cycle is now (grid highlight, count-in notice).
  useEffect(() => {
    if (phase !== "running" || !built) return;
    let raf = 0;
    let last = -2;
    let lastCount: boolean | null = null;
    const loop = () => {
      const t = playerRef.current?.position ?? 0;
      const p = pulseAt(t, built);
      if (p !== last) setActive((last = p));
      const c = t < built.offset;
      if (c !== lastCount) setCounting((lastCount = c));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, built]);

  const tap = useCallback((stroke: "dum" | "tak") => {
    const p = playerRef.current;
    if (phase !== "running" || !p || p.state !== "playing") return;
    // The learner answers what they hear, which reaches the ear after the output latency.
    const ctx = getAudioContext();
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    taps.current.push({ time: p.position - latency, stroke });
    setFlash(stroke);
    setTimeout(() => setFlash((f) => (f === stroke ? null : f)), 110);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "f" || k === "ب") { e.preventDefault(); tap("dum"); }
      if (k === "j" || k === "ت") { e.preventDefault(); tap("tak"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, tap]);

  if (!iqa || !cycle || !built) return null;
  const passed = (score?.percent ?? 0) >= TAP_PASS;
  const perCycle = score ? Array.from({ length: TAP_CYCLES }, (_, c) => {
    const marks: (boolean | null)[] = Array(built.pulses).fill(null);
    built.strokes.forEach((s, i) => { if (s.cycle === c) marks[s.pulse] = score.perStroke[i]; });
    return marks;
  }) : [];

  return (
    <section className="card flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-2xl font-semibold text-gold">{iqa.names.ar}</span>
        {phase === "running" && <span className="text-sm text-muted" aria-live="polite">{counting ? labels.countIn : ""}</span>}
      </div>

      {phase !== "done" && <IqaGrid cycle={cycle} active={active} labels={labels} />}

      {phase === "ready" && (
        <>
          <p className="m-0 text-[17px] leading-[1.9] text-soft">{fill(labels.intro, { n: TAP_CYCLES, pass: TAP_PASS })}</p>
          <p className="m-0 text-sm text-muted">{labels.keys}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label={labels.tempo} className="flex gap-1.5">
              {([[70, labels.slow], [90, labels.normal]] as const).map(([v, label]) => (
                <button key={v} type="button" aria-pressed={bpm === v} onClick={() => setBpm(v)}
                  className={`min-h-10 rounded-xl border px-3 text-sm ${bpm === v ? "border-gold bg-gold/15 text-gold" : "border-white/12 text-soft"}`}>{label}</button>
              ))}
            </div>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} className="size-4 accent-[var(--color-gold)]" />
              {labels.guide}
            </label>
            <button type="button" className="btn-gold ms-auto" onClick={begin}>{labels.start}</button>
          </div>
          {done && <span className="chip chip-teal self-start">{labels.alreadyDone}</span>}
          {!signedIn && <p className="m-0 text-[13px] text-muted">{labels.signIn}</p>}
        </>
      )}

      {phase === "running" && (
        <div className="grid grid-cols-2 gap-3" dir="rtl">
          {(["dum", "tak"] as const).map((s) => (
            <button key={s} type="button" onPointerDown={(e) => { e.preventDefault(); tap(s); }}
              className={`min-h-32 touch-none rounded-[28px] font-display text-3xl font-bold select-none sm:min-h-40 ${
                s === "dum" ? (flash === s ? "bg-gold-light text-gold-ink" : "bg-gold text-gold-ink") : flash === s ? "bg-teal-light text-teal-ink" : "border-2 border-teal-light text-teal-light"
              }`}>
              {s === "dum" ? labels.dum : labels.tak}
              <span className="block text-sm font-normal opacity-70" dir="ltr">{s === "dum" ? "F" : "J"}</span>
            </button>
          ))}
        </div>
      )}

      {phase === "done" && score && (
        <div className="flex flex-col gap-4" aria-live="polite">
          <span className={`font-display text-5xl font-bold ${passed ? "text-gold" : "text-soft"}`}>{fill(labels.result, { n: score.percent })}</span>
          <span className="text-sm text-muted">{fill(labels.hits, { hit: score.hit, total: score.expected, extra: score.extra })}</span>
          <div className="flex flex-col gap-3">
            {perCycle.map((marks, c) => (
              <div key={c} className="flex flex-wrap items-center gap-3">
                <span className="w-20 text-sm text-muted">{fill(labels.cycleN, { n: c + 1 })}</span>
                <IqaGrid cycle={cycle} marks={marks} labels={labels} compact />
              </div>
            ))}
          </div>
          <p className="m-0 text-[17px] text-soft">{passed ? (saved || done ? labels.passedSaved : labels.passed) : fill(labels.failed, { pass: TAP_PASS })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={passed ? "btn-ghost" : "btn-gold"} onClick={() => setPhase("ready")}>{labels.retry}</button>
            {passed && nextHref && <Link href={nextHref} className="btn-gold">{labels.nextItem}</Link>}
          </div>
        </div>
      )}
    </section>
  );
}
