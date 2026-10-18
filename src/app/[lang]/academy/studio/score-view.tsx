"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ENGRAVING, GLYPHS, type GlyphName } from "@/lib/music/score/glyphs";
import { layoutScore, type NameOptions, type PlacedGlyph, type ScoreLayout } from "@/lib/music/score/layout";
import type { Score } from "@/lib/music/score/types";
import type { Locale } from "@/lib/music/types";

type Props = {
  score: Score;
  locale: Locale;
  names: NameOptions;
  label: string;
  restLabel: string;
  /** Source id (composition note / tie chain) that is selected, if any. */
  selectedId?: string | null;
  onSelect?: (sourceId: string) => void;
  onNoteKeyDown?: (e: KeyboardEvent<SVGGElement>, sourceId: string) => void;
  /** While true, the sounding note is highlighted and followed. */
  playing?: boolean;
  /** What sounds now: source id and how far through that note (0–1). Read every frame; keep it stable (useCallback). */
  getPlayback?: () => { id: string | null; progress: number };
  /** Called when the sounding note changes (its visible name), for a large "now playing" readout. */
  onActiveName?: (name: string | null) => void;
  /** "large" for reading mode: bigger staff, a gliding cursor. */
  size?: "normal" | "large";
};

const r2 = (v: number) => Math.round(v * 100) / 100;
const ARABIC = /[\u0600-\u06FF]/;

/**
 * Sheet-music view (score + a name under each note). Layout is pure
 * (`layoutScore`); this component measures the container and the name font,
 * draws the result as SVG, and highlights the sounding note without
 * re-rendering React on every frame.
 */
export function ScoreView({ score, locale, names, label, restLabel, selectedId, onSelect, onNoteKeyDown, playing, getPlayback, onActiveName, size = "normal" }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cursorRef = useRef<SVGRectElement>(null);
  const [width, setWidth] = useState(0);
  // Font of the name rows; replaced (new object) once web fonts load so names are re-measured.
  const [font, setFont] = useState<{ family: string } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    const read = () => setFont({ family: getComputedStyle(el).fontFamily });
    read();
    document.fonts?.ready.then(read);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo<ScoreLayout | null>(() => {
    if (!width || !font) return null;
    const sp = size === "large" ? Math.round(Math.min(15, Math.max(9, width / 58)) * 2) / 2 : Math.round(Math.min(11, Math.max(8, width / 72)) * 2) / 2;
    const ctx = document.createElement("canvas").getContext("2d");
    const measureText = ctx
      ? (text: string, size: number) => {
          ctx.font = `${size}px ${font.family}`;
          return ctx.measureText(text).width;
        }
      : undefined;
    return layoutScore(score, { width, sp, locale, names, measureText });
  }, [score, width, locale, names, font, size]);

  // Sounding notes in reading order (first piece of each tie chain): where the cursor goes.
  const track = useMemo(() => {
    const list: { id: string; x: number; system: number; name: string }[] = [];
    const index = new Map<string, number>();
    layout?.systems.forEach((s, si) =>
      s.notes.forEach((n) => {
        if (n.rest || index.has(n.sourceId)) return;
        index.set(n.sourceId, list.length);
        list.push({ id: n.sourceId, x: n.x, system: si, name: n.name });
      }),
    );
    return { list, index };
  }, [layout]);

  // Highlight and follow the sounding note (DOM attributes, no React state per frame).
  useEffect(() => {
    const svg = svgRef.current;
    if (!playing || !svg || !getPlayback || !layout) return;
    const cursor = cursorRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let current: string | null = null;
    let currentSystem = -1;
    const mark = (id: string | null, on: boolean) => {
      if (!id) return;
      svg.querySelectorAll(`[data-src="${CSS.escape(id)}"]`).forEach((el) => (on ? el.setAttribute("data-active", "") : el.removeAttribute("data-active")));
    };
    const loop = () => {
      const { id, progress } = getPlayback();
      const at = id !== null ? track.index.get(id) : undefined;
      if (id !== current) {
        mark(current, false);
        mark(id, true);
        current = id;
        onActiveName?.(at !== undefined ? track.list[at].name : null);
        const sys = at !== undefined ? track.list[at].system : undefined;
        if (sys !== undefined && sys !== currentSystem) {
          currentSystem = sys;
          const band = svg.querySelector(`[data-system="${sys}"]`);
          const box = svg.getBoundingClientRect();
          // Follow only while the score is on screen, so changing settings mid-playback isn't hijacked.
          if (band && box.bottom > 0 && box.top < window.innerHeight) {
            band.scrollIntoView({ block: size === "large" ? "center" : "nearest", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
          }
        }
      }
      // The cursor glides from the sounding note toward the next one on the same line.
      if (cursor) {
        if (at === undefined) {
          cursor.style.opacity = "0";
        } else {
          const note = track.list[at];
          const next = track.list[at + 1];
          const sys = layout.systems[note.system];
          const end = next && next.system === note.system ? next.x : sys.x2 - layout.sp;
          const x = note.x + (end - note.x) * Math.max(0, Math.min(1, progress));
          cursor.setAttribute("transform", `translate(${r2(x)} ${r2(sys.top)})`);
          cursor.style.opacity = "1";
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      mark(current, false);
      onActiveName?.(null);
      if (cursor) cursor.style.opacity = "0";
    };
  }, [playing, getPlayback, onActiveName, track, layout, size]);

  const used = useMemo(() => {
    const set = new Set<GlyphName>();
    layout?.systems.forEach((s) => {
      s.glyphs.forEach((g) => set.add(g.name));
      s.notes.forEach((n) => n.glyphs.forEach((g) => set.add(g.name)));
    });
    return [...set];
  }, [layout]);

  const glyph = (g: PlacedGlyph, key: string | number) => (
    <use key={key} href={`#${uid}-${g.name}`} transform={`translate(${r2(g.x)} ${r2(g.y)}) scale(${r2((layout?.sp ?? 10) * (g.scale ?? 1))})`} />
  );

  // One tab stop for the whole score: the selected note, else the first note.
  const firstNote = layout?.systems.flatMap((s) => s.notes).find((n) => !n.rest)?.sourceId;
  const tabTarget = selectedId ?? firstNote;
  const seen = new Set<string>();

  return (
    <div ref={wrapRef} dir="ltr" className="w-full overflow-x-auto" style={{ minHeight: layout ? undefined : 220 }}>
      {layout && (
        <svg
          ref={svgRef}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="group"
          aria-label={label}
          className="block text-ivory-ink"
          fill="currentColor"
        >
          <defs>
            {used.map((name) => (
              <path key={name} id={`${uid}-${name}`} d={GLYPHS[name].d} />
            ))}
          </defs>
          {layout.systems.map((s, si) => {
            const lineT = ENGRAVING.staffLineThickness * layout.sp;
            return (
              <g key={si} transform={`translate(0 ${r2(s.top)})`}>
                <rect data-system={si} x={s.x1} y={r2(s.bandTop)} width={r2(s.x2 - s.x1)} height={r2(s.bandBottom - s.bandTop)} fill="none" />
                {[0, 1, 2, 3, 4].map((l) => (
                  <rect key={l} x={s.x1} y={r2(l * layout.sp - lineT / 2)} width={r2(s.x2 - s.x1)} height={r2(lineT)} opacity={0.75} />
                ))}
                {s.rects.map((r, i) => (
                  <rect key={i} x={r2(r.x)} y={r2(r.y)} width={r2(r.w)} height={r2(r.h)} />
                ))}
                {s.circles.map((c, i) => (
                  <circle key={i} cx={r2(c.x)} cy={r2(c.y)} r={r2(c.r)} />
                ))}
                {s.glyphs.map(glyph)}
                {s.polygons.map((p, i) => (
                  <polygon key={i} points={p} />
                ))}
                {s.fills.map((d, i) => (
                  <path key={i} d={d} />
                ))}
                {s.strokes.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={r2(ENGRAVING.tupletBracketThickness * layout.sp)} />
                ))}
                {s.texts.map((t, i) => (
                  <text key={i} x={r2(t.x)} y={r2(t.y)} fontSize={t.size} className={t.kind === "label" ? "fill-ink-teal font-semibold" : "fill-ink-soft"} fontStyle={t.kind === "volta" ? "italic" : undefined}>
                    {t.text}
                  </text>
                ))}
                {s.notes.map((n) => {
                  const interactive = !n.rest && !!onSelect;
                  const firstPiece = !seen.has(n.sourceId);
                  seen.add(n.sourceId);
                  const selected = !n.rest && n.sourceId === selectedId;
                  return (
                    <g
                      key={n.id}
                      data-src={n.sourceId}
                      data-selected={selected ? "" : undefined}
                      className={`group outline-none ${interactive ? "cursor-pointer" : ""}`}
                      tabIndex={interactive ? (firstPiece && n.sourceId === tabTarget ? 0 : -1) : undefined}
                      role={interactive ? "button" : undefined}
                      aria-pressed={interactive ? selected : undefined}
                      aria-label={n.rest ? restLabel : n.name}
                      onClick={interactive ? () => onSelect?.(n.sourceId) : undefined}
                      onKeyDown={interactive && onNoteKeyDown ? (e) => onNoteKeyDown(e, n.sourceId) : undefined}
                    >
                      <rect
                        x={r2(n.box.x)}
                        y={r2(n.box.y)}
                        width={r2(n.box.w)}
                        height={r2(n.box.h)}
                        rx={r2(layout.sp * 0.6)}
                        className="fill-transparent group-focus-visible:stroke-ink-teal group-focus-visible:[stroke-width:2] group-data-selected:fill-teal/20 group-data-active:fill-gold/40"
                      />
                      <g className="group-data-active:fill-ink-gold group-data-selected:fill-ink-teal">
                        {n.ledgers.map((l, i) => (
                          <rect key={i} x={r2(l.x)} y={r2(l.y)} width={r2(l.w)} height={r2(l.h)} />
                        ))}
                        {n.stem && <rect x={r2(n.stem.x)} y={r2(n.stem.y)} width={r2(n.stem.w)} height={r2(n.stem.h)} />}
                        {n.glyphs.map(glyph)}
                        {n.dots.map((d, i) => (
                          <circle key={i} cx={r2(d.x)} cy={r2(d.y)} r={r2(layout.sp * 0.2)} />
                        ))}
                      </g>
                      {n.texts.map((t, i) => (
                        <text
                          key={i}
                          x={r2(t.x)}
                          y={r2(t.y)}
                          fontSize={t.size}
                          textAnchor="middle"
                          // Arabic names read right-to-left ("♭½ مي"), as in Arabic text.
                          direction={ARABIC.test(t.text) ? "rtl" : undefined}
                          lang={t.kind === "arabic" ? "ar" : undefined}
                          className={`${t.kind === "arabic" ? "fill-ink-teal" : "fill-ink-soft"} group-data-active:fill-ink-gold group-data-active:font-semibold`}
                        >
                          {t.text}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </g>
            );
          })}
          <rect
            ref={cursorRef}
            x={r2(-layout.sp * 0.12)}
            y={r2(-layout.sp * 1.6)}
            width={r2(layout.sp * 0.24)}
            height={r2(layout.sp * 7.2)}
            rx={r2(layout.sp * 0.12)}
            className="pointer-events-none fill-ink-gold"
            style={{ opacity: 0 }}
            aria-hidden="true"
          />
        </svg>
      )}
    </div>
  );
}
