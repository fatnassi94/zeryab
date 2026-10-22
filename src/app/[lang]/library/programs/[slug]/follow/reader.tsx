"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type ReaderPage = { n: number; src: string; srcSm: string; alt: string; illustrated: boolean; tableau: number };
export type ReaderTableau = { n: number; title: string; page: number };
type Labels = {
  exit: string; prev: string; next: string; pageOf: string; jump: string; cover: string; tableau: string;
  dim: string; dimHint: string; zoomIn: string; zoomOut: string; awake: string; pages: string; pageLabel: string; hint: string;
};

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
const ZOOMS = [1, 1.6, 2.2];

// Per-device preferences (dim, zoom). Falls back to memory when storage is blocked.
const memory = new Map<string, string>();
const prefEvent = "zeryab-reader-pref";
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(prefEvent, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(prefEvent, cb);
  };
}
function readPref(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? fallback;
  } catch {
    return memory.get(key) ?? fallback;
  }
}
function writePref(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // private window: the memory copy is enough for this visit
  }
  window.dispatchEvent(new Event(prefEvent));
}
function usePref(key: string, fallback: string) {
  const value = useSyncExternalStore(subscribe, () => readPref(key, fallback), () => fallback);
  return [value, (v: string) => writePref(key, v)] as const;
}

/**
 * Follow the program while it is sung: one page per screen, swipe or arrows to
 * turn, a tableau menu to jump, zoom for phones, a dim mode for dark halls, and
 * the screen kept awake where the browser allows it. The page in view is kept
 * in the address (?p=) and remembered on this device.
 */
export function Reader({ slug, title, backHref, pages, tableaux, labels, initial, dir }: {
  slug: string;
  title: string;
  backHref: string;
  pages: ReaderPage[];
  tableaux: ReaderTableau[];
  labels: Labels;
  initial: number;
  dir: "rtl" | "ltr";
}) {
  const track = useRef<HTMLDivElement>(null);
  const total = pages.length;
  const [current, setCurrent] = useState(initial || 1);
  const [awake, setAwake] = useState(false);
  const [dim, setDim] = usePref("program-reader-dim", "0");
  const [zoomPref, setZoom] = usePref("program-reader-zoom", "0");
  const zoom = Math.min(ZOOMS.length - 1, Math.max(0, Number(zoomPref) || 0));
  const storeKey = `program-reader-page:${slug}`;
  // Nothing is saved until the reader has found its page (React runs effects twice in development).
  const settled = useRef(false);

  const goTo = useCallback((n: number, smooth = true) => {
    const page = Math.min(total, Math.max(1, n));
    const el = track.current?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "instant", inline: "center", block: "nearest" });
  }, [total]);

  // Open where the link says, else where this device left off.
  useEffect(() => {
    let n = initial;
    if (!n) {
      try {
        n = Number(localStorage.getItem(storeKey)) || 1;
      } catch {
        n = 1;
      }
    }
    goTo(n, false);
  }, [goTo, initial, storeKey]);

  // The page in view.
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        settled.current = true;
        setCurrent(Number((e.target as HTMLElement).dataset.page));
      }
    }, { root, threshold: 0.6 });
    root.querySelectorAll("[data-page]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Remember it, and keep the address pointing at it.
  useEffect(() => {
    if (!settled.current) return;
    try {
      localStorage.setItem(storeKey, String(current));
    } catch {
      // nothing to remember in a private window
    }
    const url = new URL(window.location.href);
    url.searchParams.set("p", String(current));
    window.history.replaceState(null, "", url);
  }, [current, storeKey]);

  // Keep the screen on while the program is open (and again after returning to the tab).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      try {
        const next = await navigator.wakeLock?.request("screen");
        if (!next) return;
        if (stopped) {
          await next.release();
          return;
        }
        lock = next;
        setAwake(true);
        next.addEventListener("release", () => setAwake(false));
      } catch {
        setAwake(false);
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);

  // Keyboard: arrows follow the reading direction; space and Page Down turn forward.
  useEffect(() => {
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === forward || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goTo(current + 1);
      } else if (e.key === back || e.key === "PageUp") {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === "Home") goTo(1);
      else if (e.key === "End") goTo(total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, dir, goTo, total]);

  // Zoomed in: start at the middle of the page, where the lyrics are.
  useEffect(() => {
    if (!zoom) return;
    const slide = track.current?.querySelector<HTMLElement>(`[data-page="${current}"]`);
    if (slide) slide.scrollLeft = (slide.scrollWidth - slide.clientWidth) / 2;
  }, [zoom, current]);

  const here = pages[current - 1];
  const section = tableaux.findLast((t) => t.page <= current);
  const jumpValue = section ? String(section.page) : "1";

  return (
    <div className="reader fixed inset-0 z-20 flex flex-col bg-night text-text" data-dim={dim === "1" ? "" : undefined}>
      <header className="flex items-center gap-2 border-b border-line py-2 pt-[max(8px,env(safe-area-inset-top))] ps-[max(12px,env(safe-area-inset-left))] pe-[max(12px,env(safe-area-inset-right))]">
        <Link href={backHref} className="btn-ghost min-h-11! shrink-0 px-4! text-sm">{labels.exit}</Link>
        <p className="m-0 min-w-0 flex-1 truncate text-sm font-medium max-sm:hidden">{title}</p>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
          <span className="sr-only">{labels.jump}</span>
          <select
            className="field min-h-11 w-full min-w-0 py-1.5 text-sm sm:w-64"
            value={jumpValue}
            onChange={(e) => goTo(Number(e.target.value))}
          >
            <option value="1">{labels.cover}</option>
            {tableaux.map((t) => (
              <option key={t.n} value={t.page}>{fill(labels.tableau, { n: t.n })} · {t.title}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-ghost min-h-11! shrink-0 px-4! text-sm"
          aria-pressed={dim === "1"}
          title={labels.dimHint}
          onClick={() => setDim(dim === "1" ? "0" : "1")}
        >
          {labels.dim}
        </button>
      </header>

      <div
        ref={track}
        role="region"
        aria-label={labels.pages}
        aria-roledescription="carousel"
        tabIndex={0}
        className="reader-track flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        {pages.map((p) => (
          <div
            key={p.n}
            data-page={p.n}
            role="group"
            aria-roledescription="slide"
            aria-label={fill(labels.pageLabel, { n: p.n, total })}
            dir="ltr"
            className={`reader-slide h-full w-full shrink-0 snap-center ${zoom ? "overflow-auto" : "flex items-center justify-center overflow-hidden"} ${p.illustrated ? "page-art" : "page-text"}`}
          >
            {/* Pre-rendered static pages: plain img keeps pinch-zoom and srcset simple. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              srcSet={`${p.srcSm} 800w, ${p.src} 1600w`}
              sizes={zoom ? `${Math.round(ZOOMS[zoom] * 100)}vw` : "100vw"}
              alt={p.alt}
              width={1600}
              height={2263}
              loading={Math.abs(p.n - (initial || 1)) > 1 ? "lazy" : "eager"}
              decoding="async"
              draggable={false}
              className={zoom ? "mx-auto block h-auto max-w-none bg-white" : "block h-full w-full object-contain"}
              style={zoom ? { width: `${ZOOMS[zoom] * 100}%` } : undefined}
            />
          </div>
        ))}
      </div>

      <footer className="flex items-center gap-2 border-t border-line py-2 pb-[max(8px,env(safe-area-inset-bottom))] ps-[max(12px,env(safe-area-inset-left))] pe-[max(12px,env(safe-area-inset-right))]">
        <button type="button" className="btn-ghost min-h-12! px-4!" onClick={() => goTo(current - 1)} disabled={current <= 1} aria-label={labels.prev}>
          <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center leading-tight">
          <span className="text-sm font-semibold tabular-nums" aria-live="polite">{fill(labels.pageOf, { n: current, total })}</span>
          <span className="max-w-full truncate text-xs text-muted">{awake ? labels.awake : labels.hint}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label={labels.zoomIn}>
          <button type="button" className="btn-ghost min-h-12! min-w-12 px-0!" onClick={() => setZoom(String(Math.max(0, zoom - 1)))} disabled={zoom === 0} aria-label={labels.zoomOut}>−</button>
          <button type="button" className="btn-ghost min-h-12! min-w-12 px-0!" onClick={() => setZoom(String(Math.min(ZOOMS.length - 1, zoom + 1)))} disabled={zoom === ZOOMS.length - 1} aria-label={labels.zoomIn}>+</button>
        </div>
        <button type="button" className="btn-gold min-h-12! px-5!" onClick={() => goTo(current + 1)} disabled={current >= total} aria-label={labels.next}>
          <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
        </button>
      </footer>
      <p className="sr-only" aria-live="polite">{here?.alt}</p>
    </div>
  );
}
