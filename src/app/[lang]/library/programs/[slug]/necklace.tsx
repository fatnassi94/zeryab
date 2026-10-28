"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PROGRAM_ICON_PATHS } from "@/components/program-icon";
import type { ProgramIcon } from "@/lib/programs";

export type NecklaceSong = { n: number; title: string; page: number; color: string };
export type NecklaceTableau = { n: number; title: string; color: string; icon: ProgramIcon; page: number; first: number; last: number };
type Labels = { play: string; pause: string; replay: string; next: string; stepOf: string; beadLabel: string; tableauLabel: string; hint: string };

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

// How long each stage stays before the next one (index = stage).
const HOLD = [0, 3600, 4400, 5200, 4000];
const C = 210;
const R = 138;

/**
 * The program's idea in four stages, drawn on one necklace: the beads (songs),
 * the thread (the hum between songs), the journey (one arc per tableau) and the
 * note at the centre. It plays once when scrolled into view; each stage can also
 * be chosen by hand. Beads link to their song's page in the full text.
 */
export function Necklace({ songs, tableaux, centre, steps, dir, labels }: {
  songs: NecklaceSong[];
  tableaux: NecklaceTableau[];
  centre: string;
  steps: string[];
  dir: "rtl" | "ltr";
  labels: Labels;
}) {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const drawing = useRef<SVGSVGElement>(null);

  // Draw itself the first time the necklace is in view; reduced motion shows it finished.
  useEffect(() => {
    const el = drawing.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const raf = requestAnimationFrame(() => setStage(4));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      setPlayed(true);
      setPlaying(true);
      setStage(1);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || stage < 1 || stage > 3) return;
    const id = window.setTimeout(() => {
      if (stage === 3) setPlaying(false);
      setStage(stage + 1);
    }, HOLD[stage]);
    return () => window.clearTimeout(id);
  }, [playing, stage]);

  const restart = () => {
    setPlayed(true);
    setPlaying(true);
    setStage(0);
    requestAnimationFrame(() => requestAnimationFrame(() => setStage(1)));
  };
  const toggle = () => {
    if (playing) setPlaying(false);
    else if (stage === 4 || stage === 0) restart();
    else setPlaying(true);
  };
  const choose = (s: number) => {
    setPlaying(false);
    setStage(s);
  };

  // Reading direction decides which way the necklace runs.
  const sign = dir === "rtl" ? -1 : 1;
  const step = 360 / songs.length;
  const ang = (k: number) => ((-90 + sign * k * step) * Math.PI) / 180;
  // Rounded so the server and the browser print the same coordinates (their trig differs in the last digits).
  const at = (a: number, r = R) => [Math.round((C + r * Math.cos(a)) * 100) / 100, Math.round((C + r * Math.sin(a)) * 100) / 100] as const;
  const threadTransform = sign < 0 ? `translate(${C} ${C}) rotate(90) scale(-1 1) translate(${-C} ${-C})` : `rotate(-90 ${C} ${C})`;
  const sweep = sign > 0 ? 1 : 0;
  const humPath = `M${C} ${C - R}A${R} ${R} 0 1 ${sweep} ${C} ${C + R}A${R} ${R} 0 1 ${sweep} ${C} ${C - R}`;
  const primary = playing ? labels.pause : stage === 4 && played ? labels.replay : labels.play;

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <figure className="m-0 flex flex-col gap-5">
        <svg
          ref={drawing}
          viewBox="0 0 420 420"
          className="necklace mx-auto block h-auto w-full max-w-[460px] overflow-visible"
          data-beads={stage >= 1 ? "" : undefined}
          data-thread={stage >= 2 ? "" : undefined}
          data-arcs={stage >= 3 ? "" : undefined}
          data-centre={stage >= 4 ? "" : undefined}
          role="img"
          aria-label={steps.join(" ")}
        >
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-line-strong)" strokeDasharray="2 9" />
          <circle className="nk-thread" cx={C} cy={C} r={R} fill="none" stroke="var(--color-gold)" strokeWidth="2.6" transform={threadTransform} />
          <circle className="nk-hum" r="5" fill="var(--color-gold-light)">
            <animateMotion dur="9s" repeatCount="indefinite" path={humPath} />
          </circle>

          {tableaux.map((t, i) => {
            const half = ((step / 2 - 4) * Math.PI) / 180;
            const a1 = ang(t.first - 1) - sign * half;
            const a2 = ang(t.last - 1) + sign * half;
            const span = Math.abs(a2 - a1);
            const [x1, y1] = at(a1, R + 20);
            const [x2, y2] = at(a2, R + 20);
            const [mx, my] = at((a1 + a2) / 2, R + 52);
            return (
              <g key={t.n}>
                <path
                  className="nk-arc"
                  d={`M${x1.toFixed(1)} ${y1.toFixed(1)}A${R + 20} ${R + 20} 0 ${span > Math.PI ? 1 : 0} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`}
                  fill="none"
                  stroke={t.color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  style={{ "--i": i, "--len": (span * (R + 20) + 10).toFixed(1), "--off": (span * (R + 20) + 14).toFixed(1) } as CSSProperties}
                />
                <g className="nk-mark" style={{ "--i": i } as CSSProperties}>
                  <circle cx={mx} cy={my} r="18" fill="var(--color-ink)" stroke={t.color} strokeWidth="2" />
                  <path d={PROGRAM_ICON_PATHS[t.icon]} transform={`translate(${(mx - 10.8).toFixed(1)} ${(my - 10.8).toFixed(1)}) scale(0.9)`}
                    fill="none" stroke={t.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
            );
          })}

          {songs.map((s, k) => {
            const [x, y] = at(ang(k));
            return (
              <a key={s.n} href={`#page-${s.page}`} className="nk-bead" style={{ "--i": k } as CSSProperties}>
                <title>{fill(labels.beadLabel, { n: s.n, title: s.title })}</title>
                <circle cx={x} cy={y} r="17" fill={s.color} stroke="var(--color-ink)" strokeWidth="4" />
                <circle cx={(x - 5.5).toFixed(2)} cy={(y - 6).toFixed(2)} r="4.5" fill="#fff" opacity="0.35" />
                <text x={x} y={(y + 5.5).toFixed(2)} textAnchor="middle" className="font-sans" fontSize="15" fontWeight="600" fill="var(--color-ink)">{s.n}</text>
              </a>
            );
          })}

          <g className="nk-centre">
            <circle className="nk-orbit" cx={C} cy={C} r="64" fill="none" stroke="var(--color-gold)" strokeOpacity="0.45" strokeDasharray="3 7" />
            <text x={C} y={C + (centre.length > 2 ? 14 : 26)} textAnchor="middle" className="font-display" fontSize={centre.length <= 2 ? 76 : centre.length <= 5 ? 46 : 34} fontWeight="700" fill="var(--color-gold)">{centre}</text>
          </g>
        </svg>

        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2 p-0">
          {tableaux.map((t) => (
            <li key={t.n}>
              <a
                href={`#page-${t.page}`}
                data-on={stage === 3 ? "" : undefined}
                className="nk-legend flex min-h-11 items-center gap-2.5 rounded-2xl border border-line px-3 py-2 text-sm text-soft no-underline hover:border-line-strong hover:text-text"
                style={{ "--c": t.color } as CSSProperties}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={t.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d={PROGRAM_ICON_PATHS[t.icon]} />
                </svg>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-xs text-muted">{fill(labels.tableauLabel, { n: t.n })}</span>
                  <span>{t.title}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </figure>

      <div className="flex flex-col gap-4">
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {steps.map((s, i) => {
            const n = i + 1;
            const now = stage === n;
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => choose(n)}
                  aria-current={now ? "step" : undefined}
                  className={`relative flex w-full cursor-pointer items-start gap-4 overflow-hidden rounded-2xl border p-4 text-start font-[inherit] transition-colors ${
                    now ? "border-gold/50 bg-gold/8 text-text" : stage > n ? "border-line bg-transparent text-soft" : "border-line bg-transparent text-faint"
                  }`}
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${now ? "bg-gold text-gold-ink" : "bg-white/8 text-soft"}`}>{n}</span>
                  <span className="text-lg leading-[1.8]">{s}</span>
                  {now && playing && <span key={`p-${n}`} className="nk-progress" style={{ "--d": `${HOLD[n]}ms` } as CSSProperties} />}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-gold min-w-36" onClick={toggle} aria-pressed={playing}>{primary}</button>
          <button type="button" className="btn-ghost" onClick={() => choose(Math.min(4, Math.max(1, stage + 1)))} disabled={stage >= 4 && !playing}>{labels.next}</button>
          <span className="text-sm text-muted" aria-live="polite">{stage >= 1 ? fill(labels.stepOf, { n: stage, total: steps.length }) : ""}</span>
        </div>
        <p className="m-0 text-sm leading-[1.8] text-muted">{labels.hint}</p>
      </div>
    </div>
  );
}
