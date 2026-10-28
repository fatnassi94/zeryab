"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Voice } from "@/lib/programs";

/**
 * The second picture of a program page when its idea is not a journey on a map
 * (see ProgramScene in src/lib/programs.ts): a quarrel whose two sides draw
 * closer, a flight from the ground to the sky, a gathering that lights up.
 * Each one shows the chosen tableau below it (illustration, mood, songs).
 */

export type SceneSong = { n: number; title: string; page: number; rhythm?: string; voices?: Voice[] };
export type SceneTableau = { n: number; title: string; color: string; image: string; page: number; mood?: string; songs: SceneSong[] };
export type SceneLabels = {
  tableau: string; openText: string; imageAlt: string; prev: string; next: string;
  voices: Record<Voice, string>; rhythm: string;
};

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
const r1 = (v: number) => Math.round(v * 10) / 10;

const VOICE_CHIP: Record<Voice, string> = {
  solo: "border-gold/40 text-gold-light",
  men: "border-teal-light/40 text-teal-light",
  women: "border-rose/45 text-rose",
  all: "border-white/25 text-soft",
};

/** Songs of a tableau with who sings them and their rhythm (as written in the PDF). */
function SongList({ songs, labels, only }: { songs: SceneSong[]; labels: SceneLabels; only?: number }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {songs.filter((s) => only === undefined || s.n === only).map((s) => (
        <li key={s.n} className="flex flex-wrap items-center gap-2">
          <a href={`#page-${s.page}`} className="font-medium text-text no-underline hover:text-gold-light">
            <bdi lang="ar" dir="rtl">{s.n}. {s.title}</bdi>
          </a>
          {s.voices?.map((v) => <span key={v} className={`rounded-full border px-2.5 py-0.5 text-[12px] ${VOICE_CHIP[v]}`}>{labels.voices[v]}</span>)}
          {s.rhythm && <span className="text-[13px] text-muted"><bdi lang="ar">{fill(labels.rhythm, { name: s.rhythm })}</bdi></span>}
        </li>
      ))}
    </ul>
  );
}

/** Illustration, title, mood and songs of the chosen tableau. */
function TableauCard({ tableau, labels, eyebrow, extra, only }: { tableau: SceneTableau; labels: SceneLabels; eyebrow?: string; extra?: ReactNode; only?: number }) {
  return (
    <article aria-live="polite" className="card flex flex-col overflow-hidden">
      {/* Illustration from the program PDF: static file, no optimizer needed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={tableau.n} src={tableau.image} alt={fill(labels.imageAlt, { title: tableau.title })} width={1400} height={944}
        className="map-photo block aspect-[3/2] h-auto w-full object-cover" />
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <p className="m-0 text-sm" style={{ color: tableau.color }}>{eyebrow ?? fill(labels.tableau, { n: tableau.n })}</p>
        <h3 className="m-0 font-display text-3xl font-semibold">{tableau.title}</h3>
        {extra}
        {tableau.mood && <p className="m-0 leading-[1.9] text-soft">{tableau.mood}</p>}
        <SongList songs={tableau.songs} labels={labels} only={only} />
        <a href={`#page-${tableau.page}`} className="btn-ghost mt-1 self-start min-h-11! px-4! text-sm">{fill(labels.openText, { n: tableau.page })}</a>
      </div>
    </article>
  );
}

function Steps({ count, current, onPick, labels, dir, render }: {
  count: number; current: number; onPick: (i: number) => void; labels: SceneLabels; dir: "rtl" | "ltr"; render: (i: number) => ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" className="flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" aria-pressed={current === i} onClick={() => onPick(i)}
            className={`min-h-11 rounded-2xl border px-4 text-start text-sm ${current === i ? "border-gold bg-gold/12 text-text" : "border-line text-soft hover:border-line-strong"}`}>
            {render(i)}
          </button>
        ))}
      </div>
      <span className="ms-auto flex gap-2">
        <button type="button" className="btn-ghost min-h-11! min-w-11 px-0!" onClick={() => onPick(current - 1)} disabled={current === 0} aria-label={labels.prev}>
          <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span>
        </button>
        <button type="button" className="btn-gold min-h-11! min-w-11 px-0!" onClick={() => onPick(current + 1)} disabled={current === count - 1} aria-label={labels.next}>
          <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
        </button>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ quarrel */

export type QuarrelLabels = SceneLabels & { singer: string; chorus: string; stage: string };

/** A thread between the two sides: sharp (mockery), wavy (praise), smooth with a knot (reconciliation). */
function threadPath(x1: number, x2: number, y: number, line: "jagged" | "wave" | "smooth") {
  const n = 12;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n;
    const dy = line === "jagged" ? (i % 2 ? -22 : 22) * (i === 0 || i === n ? 0 : 1) : line === "wave" ? Math.sin((i / n) * Math.PI * 4) * 14 : -Math.sin((i / n) * Math.PI) * 10;
    pts.push(`${r1(x)} ${r1(y + dy)}`);
  }
  return `M${pts.join("L")}`;
}

function Singer({ x, color, label }: { x: number; color: string; label: string }) {
  return (
    <g style={{ transform: `translateX(${x}px)` }} className="transition-transform duration-700 ease-out">
      <path d="M-46 250c4-44 22-62 46-62s42 18 46 62z" fill="#2a2f45" stroke="var(--color-line-strong)" />
      <circle cx="0" cy="150" r="30" fill="#c99a76" />
      {/* the red chechia */}
      <path d="M-24 132l4-30h40l4 30z" fill="#b8332b" />
      <path d="M0 102l10-8" stroke="#1d1d1d" strokeWidth="2" />
      <circle cx="0" cy="150" r="44" fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="2" />
      <text y="285" textAnchor="middle" fontSize="20" fill="var(--color-text)" className="font-display">{label}</text>
    </g>
  );
}

function Chorus({ x, color, label }: { x: number; color: string; label: string }) {
  return (
    <g style={{ transform: `translateX(${x}px)` }} className="transition-transform duration-700 ease-out">
      {[-38, 0, 38].map((dx, i) => (
        <g key={dx} transform={`translate(${dx} ${i === 1 ? -8 : 6})`}>
          <path d="M-30 250c3-40 14-56 30-56s27 16 30 56z" fill="#3a2a3a" />
          <path d="M-24 158a24 30 0 0 1 48 0v26h-48z" fill="#4a2f3f" />
          <circle cx="0" cy="156" r="16" fill="#c99a76" />
          <path d="M-16 162h32v12h-32z" fill="#2b1d26" />
        </g>
      ))}
      <circle cx="0" cy="160" r="70" fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="2" />
      <text y="285" textAnchor="middle" fontSize="20" fill="var(--color-text)" className="font-display">{label}</text>
    </g>
  );
}

/** The quarrel: the singer and the women’s chorus, closer at each tableau. */
export function QuarrelScene({ tableaux, acts, labels, dir }: {
  tableaux: SceneTableau[]; acts: { gap: number; line: "jagged" | "wave" | "smooth" }[]; labels: QuarrelLabels; dir: "rtl" | "ltr";
}) {
  const [sel, setSel] = useState(0);
  const pick = (i: number) => setSel(Math.min(tableaux.length - 1, Math.max(0, i)));
  const act = acts[sel];
  const cur = tableaux[sel];
  const half = 70 + act.gap * 250;
  // The singer stands where reading starts.
  const singerX = dir === "rtl" ? 400 + half : 400 - half;
  const chorusX = dir === "rtl" ? 400 - half : 400 + half;
  const a = Math.min(singerX, chorusX) + (singerX < chorusX ? 52 : 76);
  const b = Math.max(singerX, chorusX) - (singerX > chorusX ? 52 : 76);

  return (
    <div className="flex flex-col gap-5">
      <Steps count={tableaux.length} current={sel} onPick={pick} labels={labels} dir={dir}
        render={(i) => <span className="flex flex-col leading-tight"><span className="text-xs text-muted">{fill(labels.tableau, { n: i + 1 })}</span><span className="font-semibold" style={{ color: tableaux[i].color }}>{tableaux[i].title}</span></span>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <figure className="m-0 overflow-hidden rounded-[var(--radius-card)] border border-line bg-[radial-gradient(90%_80%_at_50%_30%,#2a1712_0%,var(--color-ink)_75%)] p-2 sm:p-4">
          <svg viewBox="0 0 800 300" className="block h-auto w-full" role="img" aria-label={fill(labels.stage, { n: sel + 1 })}>
            <path d="M0 252H800" stroke="var(--color-line-strong)" />
            {b > a && (
              <path d={threadPath(a, b, 168, act.line)} fill="none" stroke={cur.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                className="transition-[d] duration-700" />
            )}
            {act.line === "smooth" && (
              <g transform="translate(400 150)" className="qr-knot">
                <path d="M0 12s-14-8.6-14-19a7.8 7.8 0 0 1 14-4.6 7.8 7.8 0 0 1 14 4.6C14 3.4 0 12 0 12z" fill={cur.color} />
              </g>
            )}
            <Singer x={singerX} color={cur.color} label={labels.singer} />
            <Chorus x={chorusX} color={cur.color} label={labels.chorus} />
          </svg>
        </figure>
        <TableauCard tableau={cur} labels={labels} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- flight */

export type FlightStation = { song: number; page: number; height: number; place: string; dance: string; rhythm?: string };
export type FlightLabels = SceneLabels & { ground: string; sky: string; back: string; station: string; dance: string; label: string };

function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [r1(p1[0] + (p2[0] - p0[0]) / 6), r1(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [r1(p2[0] - (p3[0] - p1[0]) / 6), r1(p2[1] - (p3[1] - p1[1]) / 6)];
    d += `C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** The rise: each station placed by how high the dance goes, from the river banks to the sky and back. */
export function FlightScene({ tableaux, stations, labels, dir }: { tableaux: SceneTableau[]; stations: FlightStation[]; labels: FlightLabels; dir: "rtl" | "ltr" }) {
  const [sel, setSel] = useState(0);
  const pick = (i: number) => setSel(Math.min(stations.length - 1, Math.max(0, i)));
  const W = 800, top = 50, ground = 360;
  const xs = stations.map((_, i) => r1(110 + (i * (W - 220)) / (stations.length - 1)));
  const pts: [number, number][] = stations.map((s, i) => [dir === "rtl" ? W - xs[i] : xs[i], r1(ground - 16 - s.height * (ground - top - 40))]);
  const st = stations[sel];
  const tableau = tableaux.find((t) => t.songs.some((s) => s.n === st.song))!;
  const isReturn = stations.findIndex((s) => s.song === st.song) !== sel;
  const [bx, by] = pts[sel];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <figure className="m-0 flex flex-col gap-3">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-[linear-gradient(180deg,#1b1640_0%,#2a2350_45%,#3b2a2a_80%,#2a1f17_100%)] p-2 sm:p-4">
            <svg viewBox={`0 0 ${W} 420`} className="block h-auto w-full" role="group" aria-label={labels.label}>
              {[[90, 70], [210, 40], [330, 90], [470, 55], [600, 85], [720, 45], [150, 130], [540, 140], [690, 150]].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#fff" opacity="0.55" />
              ))}
              {/* Mount Sannine in the middle distance */}
              <path d="M220 360L330 250l40 30 60-80 70 70 40-20 120 110z" fill="#3b2f4a" opacity="0.75" />
              <path d="M0 360H800V420H0z" fill="#3a2c1d" />
              {/* the two rivers, where the journey starts */}
              <g transform={dir === "rtl" ? `translate(${W} 0) scale(-1 1)` : undefined}>
                <path d="M20 382c40-10 70 8 120-2s80 6 120-4" fill="none" stroke="#5aa9d6" strokeWidth="3" strokeLinecap="round" />
                <path d="M30 404c40-8 80 8 130-2s70 4 110-4" fill="none" stroke="#5aa9d6" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              </g>
              <text x={dir === "rtl" ? W - 24 : 24} y={top + 4} textAnchor="start" fontSize="16" fill="var(--color-text)" fillOpacity="0.55">{labels.sky}</text>
              <text x={dir === "rtl" ? W - 24 : 24} y={ground - 10} textAnchor="start" fontSize="16" fill="var(--color-text)" fillOpacity="0.55">{labels.ground}</text>

              <path d={smooth(pts)} fill="none" stroke="var(--color-gold)" strokeWidth="2.6" strokeDasharray="1 9" strokeLinecap="round" />
              {pts.map(([x, y], i) => {
                const s = stations[i];
                const on = i === sel;
                const back = stations.findIndex((o) => o.song === s.song) !== i;
                const color = tableaux.find((t) => t.songs.some((x2) => x2.n === s.song))!.color;
                return (
                  <g key={i} role="button" tabIndex={0} aria-pressed={on} aria-label={`${fill(labels.station, { n: i + 1 })}: ${s.place} · ${s.dance}`}
                    onClick={() => pick(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } }}
                    className="map-stop cursor-pointer outline-none">
                    <circle cx={x} cy={y} r="30" fill="transparent" />
                    {on && <circle cx={x} cy={y} r="24" fill="none" stroke={color} strokeWidth="2" className="map-pulse" />}
                    <circle cx={x} cy={y} r={on ? 17 : 14} fill={color} stroke="var(--color-ink)" strokeWidth="3" />
                    <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-ink)">{s.song}</text>
                    <text x={x} y={y + (s.height > 0.7 ? 44 : -26)} textAnchor="middle" fontSize="19" fontWeight={on ? 700 : 500}
                      fill={on ? "var(--color-text)" : "var(--color-soft)"} className="font-display">{back ? `${labels.back} · ${s.place}` : s.place}</text>
                  </g>
                );
              })}
              {/* the partridge flies to the chosen station */}
              <g style={{ transform: `translate(${bx}px, ${by - 64}px)` }} className="transition-transform duration-700 ease-out" aria-hidden="true">
                <path d="M-14 2c5-.7 9-4.5 10-10.5 1.4 5 4.7 8 9.3 8 2.7 0 5.4-1.1 7.9-3.7-1.7 6.9-6.6 11.2-12.9 12.3l-2.1 5-1.5-4.9c-4.3-.6-7.7-2.3-10-5.9z"
                  fill="var(--color-gold)" transform={dir === "rtl" ? "scale(-1 1)" : undefined} />
              </g>
            </svg>
          </div>
          <Steps count={stations.length} current={sel} onPick={pick} labels={labels} dir={dir}
            render={(i) => <span>{stations.findIndex((o) => o.song === stations[i].song) !== i ? `${labels.back} · ` : `${stations[i].song}. `}{stations[i].place}</span>} />
        </figure>
        <TableauCard tableau={tableau} labels={labels} only={st.song}
          eyebrow={`${fill(labels.station, { n: sel + 1 })} · ${st.place}`}
          extra={
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-muted">{labels.dance}</dt>
              <dd className="m-0 text-text">{isReturn ? `${labels.back}: ` : ""}{st.dance}</dd>
              {st.rhythm && (<><dt className="text-muted">{fill(labels.rhythm, { name: "" }).trim()}</dt><dd className="m-0 text-text"><bdi lang="ar">{st.rhythm}</bdi></dd></>)}
            </dl>
          } />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- majlis */

export type MajlisMoment = { song: number; lit: number; clap?: boolean; ululation?: boolean; note: string };
export type MajlisLabels = SceneLabels & { song: string; label: string; clap: string; ululation: string };

const SEATS = 12;
/** Seats light up from the storyteller (top) outward, alternating sides. */
const ORDER = [0, 1, 11, 2, 10, 3, 9, 4, 8, 5, 7, 6];

/** The gathering: one voice at first, then more and more, until everyone sings and claps. */
export function MajlisScene({ tableaux, moments, labels, dir }: { tableaux: SceneTableau[]; moments: MajlisMoment[]; labels: MajlisLabels; dir: "rtl" | "ltr" }) {
  const [sel, setSel] = useState(0);
  const pick = (i: number) => setSel(Math.min(moments.length - 1, Math.max(0, i)));
  const m = moments[sel];
  const tableau = tableaux.find((t) => t.songs.some((s) => s.n === m.song))!;
  const song = tableau.songs.find((s) => s.n === m.song)!;
  const lit = new Set(ORDER.slice(0, m.lit));
  const C = 210, R = 150;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <figure className="m-0 flex flex-col gap-3">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-[radial-gradient(70%_70%_at_50%_50%,#33240f_0%,var(--color-ink)_80%)] p-2 sm:p-4">
            <svg viewBox="0 0 420 420" className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={fill(labels.label, { lit: m.lit, total: SEATS })}>
              {/* the lantern glows brighter as more voices join */}
              <circle cx={C} cy={C} r={34 + m.lit * 4} fill="#f0a43a" opacity={0.06 + m.lit * 0.008} className="transition-all duration-700" />
              <g transform={`translate(${C - 24} ${C - 30}) scale(2)`} fill="none" stroke="#f0c37a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v2M9 4h6l1.5 3h-9zM7.5 7h9l-1.2 10H8.7zM8.7 17h6.6v3H8.7z" />
                <path d="M12 10v4" stroke="#ffd98a" strokeWidth="2.4" />
              </g>
              {Array.from({ length: SEATS }, (_, i) => {
                const a = ((-90 + (dir === "rtl" ? -1 : 1) * i * (360 / SEATS)) * Math.PI) / 180;
                const x = r1(C + R * Math.cos(a));
                const y = r1(C + R * Math.sin(a));
                const on = lit.has(i);
                const color = on ? (i === 0 ? "var(--color-gold)" : tableau.color) : "#3a3f55";
                return (
                  <g key={i} transform={`translate(${x} ${y})`} style={{ "--i": ORDER.indexOf(i) } as CSSProperties}>
                    {on && m.clap && <circle r="24" fill="none" stroke={tableau.color} strokeWidth="1.5" className="mj-clap" />}
                    {on && m.ululation && i % 3 === 0 && <path d="M-6 -30c4-4-4-8 0-12s-4-8 0-12" fill="none" stroke="var(--color-gold-light)" strokeWidth="1.6" className="mj-ulu" />}
                    <path d="M-15 16c1-11 7-16 15-16s14 5 15 16z" fill={color} className="transition-colors duration-500" />
                    <circle cy="-8" r="8.5" fill={color} className="transition-colors duration-500" />
                  </g>
                );
              })}
            </svg>
          </div>
          <Steps count={moments.length} current={sel} onPick={pick} labels={labels} dir={dir}
            render={(i) => {
              const s = tableaux.flatMap((t) => t.songs).find((x) => x.n === moments[i].song);
              return <bdi lang="ar" dir="rtl">{moments[i].song}. {s?.title}</bdi>;
            }} />
        </figure>
        <TableauCard tableau={tableau} labels={labels} only={m.song}
          eyebrow={`${fill(labels.tableau, { n: tableau.n })} · ${fill(labels.song, { n: song.n })}`}
          extra={
            <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] text-text">
              <span>{m.note}</span>
              {m.clap && <span className="chip">{labels.clap}</span>}
              {m.ululation && <span className="chip">{labels.ululation}</span>}
            </p>
          } />
      </div>
    </div>
  );
}
