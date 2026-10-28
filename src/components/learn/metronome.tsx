"use client";

import { useEffect, useRef, useState } from "react";
import { Metronome as Engine } from "@/lib/audio/metronome";

export type MetronomeLabels = { metronome: string; start: string; stop: string; bpm: string; slower: string; faster: string; beatsPerBar: string };

const MIN = 40;
const MAX = 200;

/** Metronome: tempo, beats per bar, and a pulse you can see (the first beat in gold). */
export function Metronome({ bpm: initialBpm = 60, beats: initialBeats = 4, text, labels }: { bpm?: number; beats?: number; text?: string; labels: MetronomeLabels }) {
  const [bpm, setBpm] = useState(initialBpm);
  const [beats, setBeats] = useState(initialBeats);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const engine = useRef<Engine | null>(null);

  useEffect(() => () => engine.current?.stop(), []);

  const get = () => (engine.current ??= new Engine((b) => setBeat(b)));
  const toggle = () => {
    if (running) {
      get().stop();
      setRunning(false);
      setBeat(-1);
    } else {
      void get().start(bpm, beats);
      setRunning(true);
    }
  };
  const changeBpm = (v: number) => {
    const next = Math.max(MIN, Math.min(MAX, Math.round(v)));
    setBpm(next);
    get().bpm = next;
  };
  const changeBeats = (v: number) => {
    setBeats(v);
    get().beats = v;
  };

  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-teal/25 bg-teal/8 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-lg font-semibold text-teal-light">{labels.metronome}</span>
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: beats }, (_, i) => (
            <span key={i} className={`size-4 rounded-full transition-transform duration-100 ${beat === i ? (i === 0 ? "scale-125 bg-gold" : "scale-125 bg-teal-light") : "bg-white/12"}`} />
          ))}
        </div>
      </div>
      {text && <p className="m-0 text-[15px] leading-[1.8] text-soft">{text}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggle} aria-pressed={running} className={running ? "btn-ghost" : "btn-gold"}>
          {running ? labels.stop : labels.start}
        </button>
        <div className="flex items-center gap-1.5">
          <button type="button" className="btn-ghost min-h-10! min-w-10! px-0!" aria-label={labels.slower} onClick={() => changeBpm(bpm - 5)}>−</button>
          <label className="flex flex-col items-center px-1">
            <span className="font-display text-2xl font-semibold tabular-nums" aria-live="off">{bpm}</span>
            <span className="text-[12px] text-muted">{labels.bpm}</span>
          </label>
          <button type="button" className="btn-ghost min-h-10! min-w-10! px-0!" aria-label={labels.faster} onClick={() => changeBpm(bpm + 5)}>+</button>
        </div>
        <input type="range" min={MIN} max={MAX} step={1} value={bpm} onChange={(e) => changeBpm(Number(e.target.value))}
          aria-label={labels.bpm} className="min-w-[140px] flex-1 accent-[var(--color-gold)]" />
        <div role="group" aria-label={labels.beatsPerBar} className="flex gap-1">
          {[2, 3, 4].map((b) => (
            <button key={b} type="button" aria-pressed={beats === b} onClick={() => changeBeats(b)}
              className={`min-h-10 min-w-10 rounded-xl border text-sm ${beats === b ? "border-gold bg-gold/15 text-gold" : "border-white/12 text-soft"}`}>
              {b}/4
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
