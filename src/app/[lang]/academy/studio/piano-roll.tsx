"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { Composition } from "@/lib/music/composer/types";
import { degreesOf, tonesOf } from "@/lib/music/maqam/engine";
import type { MaqamVariant } from "@/lib/music/maqam/types";
import { TONES, westernName } from "@/lib/music/notes";
import type { Iqa } from "@/lib/music/rhythm/types";
import type { Locale } from "@/lib/music/types";

const PX_PER_PULSE = 16;
const ROW_HEIGHT = 34;

type Props = {
  comp: Composition;
  variant: MaqamVariant;
  iqa: Iqa;
  locale: Locale;
  label: string;
  phraseLabels: Record<"opening" | "development" | "climax" | "cadence", string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onNoteKey: (e: KeyboardEvent<HTMLButtonElement>, id: string) => void;
  playing: boolean;
  /** Seconds since playback started. */
  getPosition: () => number;
  pulseSeconds: number;
};

/** Degree grid of the generated melody. Time runs left → right in every language (audio convention). */
export function PianoRoll({ comp, variant, iqa, locale, label, phraseLabels, selected, onSelect, onNoteKey, playing, getPosition, pulseSeconds }: Props) {
  const top = degreesOf(variant).length - 1;
  const totalPulses = comp.cycles * iqa.pulses;
  const rows = Array.from({ length: top + 1 }, (_, i) => top - i); // high → low
  const toneOf = (degree: number, direction: "ascending" | "descending") => {
    const tones = tonesOf(variant, direction);
    return tones[Math.min(degree, tones.length - 1)];
  };

  // Playhead driven by the audio clock (no React re-render per frame).
  const headRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing) {
      if (headRef.current) headRef.current.style.transform = "translateX(0)";
      return;
    }
    let raf = 0;
    const loop = () => {
      if (headRef.current) {
        const x = (getPosition() / pulseSeconds) * PX_PER_PULSE;
        headRef.current.style.transform = `translateX(${Math.min(x, totalPulses * PX_PER_PULSE)}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, getPosition, pulseSeconds, totalPulses]);

  return (
    <section aria-label={label} className="card overflow-hidden">
      <div dir="ltr" className="flex">
        <div className="sticky left-0 z-10 flex-none border-e border-line bg-panel" style={{ paddingTop: 28 }}>
          {rows.map((d) => {
            const tone = toneOf(d, "ascending");
            return (
              <div key={d} style={{ height: ROW_HEIGHT }}
                className={`flex w-28 items-center justify-between gap-2 px-3 text-xs ${d === 0 ? "text-gold" : d === variant.ghammaz ? "text-teal-light" : "text-muted"}`}>
                <span className="font-display text-sm" lang="ar">{TONES[tone].ar}</span>
                <span dir="auto">{westernName(tone, locale)}</span>
              </div>
            );
          })}
        </div>
        <div className="relative overflow-x-auto">
          <div className="relative" style={{ width: totalPulses * PX_PER_PULSE, height: 28 + rows.length * ROW_HEIGHT }}>
            {comp.phrases.map((p) => (
              <div key={p.role} className="absolute top-0 flex h-7 items-center border-s border-gold/30 ps-2 text-[11px] text-muted"
                style={{ left: p.startCycle * iqa.pulses * PX_PER_PULSE, width: p.cycles * iqa.pulses * PX_PER_PULSE }}>
                {phraseLabels[p.role]}
              </div>
            ))}
            {rows.map((d, r) => (
              <div key={d} className={`absolute inset-x-0 ${d === 0 ? "bg-gold/6" : d === variant.ghammaz ? "bg-teal/6" : r % 2 ? "bg-white/[0.015]" : ""}`}
                style={{ top: 28 + r * ROW_HEIGHT, height: ROW_HEIGHT }} />
            ))}
            {Array.from({ length: comp.cycles + 1 }, (_, c) => (
              <div key={c} aria-hidden="true" className="absolute top-7 bottom-0 w-px bg-white/10" style={{ left: c * iqa.pulses * PX_PER_PULSE }} />
            ))}
            {comp.notes.map((n, i) => {
              const tone = toneOf(n.degree, n.direction);
              const isSel = n.id === selected;
              return (
                <button
                  key={n.id}
                  id={`note-${n.id}`}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={`${i + 1}. ${TONES[tone].ar} (${westernName(tone, locale)})`}
                  onClick={() => onSelect(isSel ? null : n.id)}
                  onKeyDown={(e) => onNoteKey(e, n.id)}
                  className={`absolute rounded-md border transition-colors ${isSel ? "border-gold-light bg-gold-light" : "border-gold/40 bg-gold/80 hover:bg-gold"}`}
                  style={{
                    left: n.startPulse * PX_PER_PULSE + 1,
                    width: Math.max(8, n.durationPulses * PX_PER_PULSE - 2),
                    top: 28 + (top - n.degree) * ROW_HEIGHT + 6,
                    height: ROW_HEIGHT - 12,
                    opacity: 0.55 + n.velocity * 0.45,
                  }}
                />
              );
            })}
            <div ref={headRef} aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 left-0 w-0.5 bg-text/80 transition-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
