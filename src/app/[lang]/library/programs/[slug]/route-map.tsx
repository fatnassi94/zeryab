"use client";

import { useState, type KeyboardEvent } from "react";
import type { ProgramStop } from "@/lib/programs";

export type MapStop = ProgramStop & {
  n: number;
  placeName: string;
  title: string;
  color: string;
  image: string;
  page: number;
  mood?: string;
  songs: { n: number; title: string }[];
};
type Labels = {
  hint: string; tableau: string; openText: string; prev: string; next: string;
  med: string; indian: string; sahara: string; north: string; onward: string; imageAlt: string;
};

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

// Equirectangular projection of the region (longitude −8…58, latitude 8…54) onto 800×560.
const X = (lon: number) => Math.round((lon + 8) * 12 * 10) / 10;
const Y = (lat: number) => Math.round((54 - lat) * 12 * 10) / 10;

/** Catmull-Rom through the points, as cubic Béziers. */
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Leg({ d, style, color }: { d: string; style: MapStop["leg"]["style"]; color: string }) {
  if (style === "rails") {
    return (
      <g>
        <path d={d} fill="none" stroke={color} strokeWidth="12" strokeDasharray="2 8" opacity="0.6" />
        <path d={d} fill="none" stroke={color} strokeWidth="7" />
        <path d={d} fill="none" stroke="var(--color-ink)" strokeWidth="3.6" />
      </g>
    );
  }
  if (style === "river") {
    return (
      <g>
        <path d={d} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        <path d={d} fill="none" stroke="#9cc6f0" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    );
  }
  if (style === "sea") return <path d={d} fill="none" stroke={color} strokeWidth="3" strokeDasharray="9 7" strokeLinecap="round" />;
  if (style === "path") return <path d={d} fill="none" stroke={color} strokeWidth="4.2" strokeDasharray="0.1 10" strokeLinecap="round" />;
  return <path d={d} fill="none" stroke="var(--color-gold)" strokeWidth="3" strokeDasharray="0.1 9" strokeLinecap="round" opacity="0.55" />;
}

/**
 * The journey on a map: one thread changing form (rails, Nile, sea, desert path)
 * through the stops. Choosing a stop shows its tableau: illustration, title,
 * songs, and a link to its page in the full text.
 */
export function RouteMap({ stops, labels, dir }: { stops: MapStop[]; labels: Labels; dir: "rtl" | "ltr" }) {
  const [sel, setSel] = useState(1);
  const cur = stops[sel - 1];
  const pick = (n: number) => setSel(Math.min(stops.length, Math.max(1, n)));
  const onKey = (e: KeyboardEvent, n: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(n);
    }
  };
  const region = (x: number, y: number, text: string) => (
    <text x={x} y={y} textAnchor="middle" fontSize="17" fontStyle="italic" fill="var(--color-text)" fillOpacity="0.32">{text}</text>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-[radial-gradient(120%_90%_at_70%_40%,#141b33_0%,var(--color-ink)_70%)] p-2 sm:p-4">
        <svg viewBox="0 0 800 560" className="block h-auto w-full" role="group" aria-label={labels.hint}>
          {[0, 10, 20, 30, 40, 50].map((lon) => <path key={`lo${lon}`} d={`M${X(lon)} 0V560`} stroke="var(--color-text)" strokeOpacity="0.06" />)}
          {[10, 20, 30, 40, 50].map((lat) => <path key={`la${lat}`} d={`M0 ${Y(lat)}H800`} stroke="var(--color-text)" strokeOpacity="0.06" />)}
          {region(X(18), Y(38.2), labels.med)}
          {region(X(52), Y(9.2), labels.indian)}
          {region(X(13), Y(24), labels.sahara)}
          <g transform="translate(756 44)">
            <path d="M0 -22L6 4H-6z" fill="var(--color-gold)" fillOpacity="0.8" />
            <text y="24" textAnchor="middle" fontSize="13" fill="var(--color-muted)">{labels.north}</text>
          </g>

          {stops.map((s, i) => {
            const from: [number, number] = [X(s.lon), Y(s.lat)];
            const next = stops[i + 1];
            const pts: [number, number][] = [from, ...s.leg.via.map(([lo, la]) => [X(lo), Y(la)] as [number, number])];
            if (next) pts.push([X(next.lon), Y(next.lat)]);
            return <Leg key={`leg${s.n}`} d={smooth(pts)} style={s.leg.style} color={stops[s.leg.of - 1]?.color ?? s.color} />;
          })}
          {(() => {
            const last = stops[stops.length - 1].leg.via.at(-1);
            return last ? (
              <text x={X(last[0])} y={Y(last[1]) - 24} textAnchor={dir === "rtl" ? "end" : "start"} fontSize="14" fill="var(--color-gold)">{labels.onward}</text>
            ) : null;
          })()}

          {stops.map((s) => {
            const x = X(s.lon), y = Y(s.lat);
            const on = s.n === sel;
            const below = s.label === "below";
            const tx = below ? x : s.label === "left" ? x - 22 : x + 22;
            // In rtl text, "start" is the right edge.
            const anchor = below ? "middle" : (s.label === "left") === (dir === "rtl") ? "start" : "end";
            return (
              <g
                key={s.n}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${fill(labels.tableau, { n: s.n })}: ${s.title} · ${s.placeName}`}
                onClick={() => pick(s.n)}
                onKeyDown={(e) => onKey(e, s.n)}
                className="map-stop cursor-pointer outline-none"
              >
                <circle cx={x} cy={y} r="30" fill="transparent" />
                {on && <circle cx={x} cy={y} r="24" fill="none" stroke={s.color} strokeWidth="2" className="map-pulse" />}
                <circle cx={x} cy={y} r={on ? 17 : 14} fill={s.color} stroke="var(--color-ink)" strokeWidth="3" />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-ink)">{s.n}</text>
                <text x={tx} y={below ? y + 42 : y + 7} textAnchor={anchor} fontSize="22" fontWeight={on ? 700 : 500}
                  fill={on ? "var(--color-text)" : "var(--color-soft)"} className="font-display">{s.placeName}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <article aria-live="polite" className="card flex flex-col overflow-hidden">
        {/* Illustration from the program PDF: static file, no optimizer needed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={cur.n} src={cur.image} alt={fill(labels.imageAlt, { title: cur.title })} width={1400} height={944}
          className="map-photo block aspect-[3/2] h-auto w-full object-cover" />
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <p className="m-0 text-sm" style={{ color: cur.color }}>{fill(labels.tableau, { n: cur.n })} · {cur.placeName}</p>
          <h3 className="m-0 font-display text-3xl font-semibold">{cur.title}</h3>
          {cur.mood && <p className="m-0 leading-[1.9] text-soft">{cur.mood}</p>}
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {cur.songs.map((s) => (
              <li key={s.n} className="chip"><bdi lang="ar" dir="rtl">{s.n}. {s.title}</bdi></li>
            ))}
          </ul>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <a href={`#page-${cur.page}`} className="btn-ghost min-h-11! px-4! text-sm">{fill(labels.openText, { n: cur.page })}</a>
            <span className="ms-auto flex gap-2">
              <button type="button" className="btn-ghost min-h-11! min-w-11 px-0!" onClick={() => pick(sel - 1)} disabled={sel === 1} aria-label={labels.prev}>
                <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span>
              </button>
              <button type="button" className="btn-gold min-h-11! min-w-11 px-0!" onClick={() => pick(sel + 1)} disabled={sel === stops.length} aria-label={labels.next}>
                <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
              </button>
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
