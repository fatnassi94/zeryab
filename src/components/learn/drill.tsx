"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { completeLesson } from "@/app/[lang]/academy/actions";
import { ScoreView } from "@/app/[lang]/academy/studio/score-view";
import { Player } from "@/lib/audio/engine";
import { makeDrill, type DrillQuestion } from "@/lib/courses/drills";
import { cycleTimeline, type Cycle } from "@/lib/courses/rhythm";
import { parseNotation } from "@/lib/courses/notation";
import { DRILL_LENGTH, DRILL_PASS } from "@/lib/courses/rules";
import type { DrillKind } from "@/lib/courses/types";
import { IqaGrid, type IqaLabels } from "./iqa";
import { buildTimeline, NotationExample, type NotationLabels } from "./notation-example";

export type DrillLabels = NotationLabels & {
  start: string; intro: string; questionOf: string; next: string; finish: string; right: string; wrong: string;
  result: string; passed: string; passedSaved: string; failed: string; retry: string; listen: string; signIn: string; nextItem: string; alreadyDone: string;
  iqa: IqaLabels;
};

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
const NO_NAMES = { solfege: false, arabic: false, lyrics: false };

/** A practice drill: ten generated questions, instant feedback with sound, done from 8/10. */
export function Drill({ kind, lessonId, path, signedIn, done, nextHref, labels }: {
  kind: DrillKind; lessonId: string; path: string; signedIn: boolean; done: boolean; nextHref: string | null; labels: DrillLabels;
}) {
  const [seed, setSeed] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState<boolean[]>([]);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();
  const questions = useMemo(() => (seed === null ? [] : makeDrill(kind, seed)), [kind, seed]);
  const playerRef = useRef<Player | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const player = () => (playerRef.current ??= new Player());
  const playNotation = (notation: string) => void player().play(buildTimeline(notation, 90, false).timeline);
  const playCycle = (cycle: Cycle) => {
    const single = !cycle.skeleton.includes(" ");
    const t = cycleTimeline(cycle, { quarterBpm: 90, cycles: single ? 1 : 2 });
    void player().play({ melody: [], drone: [], percussion: t.hits, duration: t.duration });
  };
  /** What sounds when a question appears (ear questions) and once it is answered. */
  const listen = (q?: DrillQuestion) => (q?.listen ? playNotation(q.listen) : q?.listenCycle ? playCycle(q.listenCycle) : undefined);
  const hear = (q: DrillQuestion) => (q.hear ? playNotation(q.hear) : q.hearCycle ? playCycle(q.hearCycle) : undefined);

  useEffect(() => () => playerRef.current?.stop(), []);

  const q = questions[step];
  const finished = seed !== null && step >= questions.length;
  const score = right.filter(Boolean).length;

  const begin = () => {
    playerRef.current?.stop();
    const s = Date.now();
    setSeed(s);
    setStep(0);
    setPicked(null);
    setRight([]);
    setSaved(false);
    listen(makeDrill(kind, s)[0]);
  };

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    setRight((r) => [...r, i === q.answer]);
    hear(q);
    requestAnimationFrame(() => nextRef.current?.focus());
  };

  const advance = () => {
    const nextStep = step + 1;
    setStep(nextStep);
    setPicked(null);
    if (nextStep >= questions.length) {
      const total = right.filter(Boolean).length;
      if (total >= DRILL_PASS && signedIn && !done) {
        startTransition(async () => {
          const res = await completeLesson(lessonId, path);
          if (res.ok) setSaved(true);
        });
      }
    } else listen(questions[nextStep]);
  };

  if (seed === null) {
    return (
      <section className="card flex flex-col items-start gap-4 p-6 sm:p-8">
        <p className="m-0 text-[17px] leading-[1.9] text-soft">{fill(labels.intro, { n: DRILL_LENGTH, pass: DRILL_PASS })}</p>
        {done && <span className="chip chip-teal">{labels.alreadyDone}</span>}
        <button type="button" className="btn-gold" onClick={begin}>{labels.start}</button>
        {!signedIn && <p className="m-0 text-[13px] text-muted">{labels.signIn}</p>}
      </section>
    );
  }

  if (finished) {
    const passed = score >= DRILL_PASS;
    return (
      <section className="card flex flex-col items-start gap-4 p-6 sm:p-8" aria-live="polite">
        <span className={`font-display text-5xl font-bold ${passed ? "text-gold" : "text-soft"}`}>{fill(labels.result, { score, total: questions.length })}</span>
        <p className="m-0 text-[17px] text-soft">{passed ? (saved || done ? labels.passedSaved : labels.passed) : fill(labels.failed, { pass: DRILL_PASS })}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={passed ? "btn-ghost" : "btn-gold"} onClick={begin}>{labels.retry}</button>
          {passed && nextHref && <Link href={nextHref} className="btn-gold">{labels.nextItem}</Link>}
        </div>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-5 p-6 sm:p-8" aria-labelledby="drill-q">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{fill(labels.questionOf, { n: step + 1, total: questions.length })}</span>
        <ol className="m-0 flex list-none gap-1.5 p-0" aria-hidden="true">
          {questions.map((_, i) => (
            <li key={i} className={`h-2 w-5 rounded-full ${i < right.length ? (right[i] ? "bg-teal-light" : "bg-rose") : i === step ? "bg-gold" : "bg-white/12"}`} />
          ))}
        </ol>
      </div>
      <h2 id="drill-q" lang="ar" className="m-0 font-display text-2xl font-semibold">{q.prompt}</h2>
      {q.notation && (
        <div className="mx-auto w-full max-w-[420px]">
          <NotationExample notation={q.notation} playable={false} size="large" labels={labels} />
        </div>
      )}
      {q.grid && <IqaGrid cycle={q.grid} labels={labels.iqa} />}
      {(q.listen || q.listenCycle) && (
        <button type="button" className="btn-ghost self-start" onClick={() => listen(q)}>{labels.listen}</button>
      )}
      <div role="group" aria-label={q.prompt}
        className={q.options.some((o) => o.notation) ? "grid gap-3 sm:grid-cols-3" : "grid grid-cols-[repeat(auto-fit,minmax(min(96px,100%),1fr))] gap-2.5"}>
        {q.options.map((o, i) => {
          let cls = "border-white/12 bg-white/3 hover:border-gold/50";
          if (picked !== null) {
            if (i === q.answer) cls = "border-teal-light bg-teal/20";
            else if (i === picked) cls = "border-rose bg-rose/15";
            else cls = "border-white/8 opacity-60";
          }
          return (
            <button key={i} type="button" onClick={() => answer(i)} disabled={picked !== null && i !== picked && i !== q.answer}
              aria-pressed={picked === i} lang="ar"
              className={`flex min-h-14 flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-lg font-medium text-text ${cls}`}>
              {o.notation ? (
                <>
                  <span className="w-full rounded-xl bg-ivory p-1"><ScoreView score={parseNotation(o.notation)} locale="ar" names={NO_NAMES} label={o.label} restLabel={labels.rest} size="large" /></span>
                  <span className="text-sm">{o.label}</span>
                </>
              ) : o.label}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          <span className={`font-semibold ${picked === q.answer ? "text-teal-light" : "text-rose"}`}>
            {picked === q.answer ? labels.right : fill(labels.wrong, { answer: q.options[q.answer].label })}
          </span>
          <button ref={nextRef} type="button" className="btn-gold ms-auto" onClick={advance}>
            {step + 1 >= questions.length ? labels.finish : labels.next}
          </button>
        </div>
      )}
    </section>
  );
}
