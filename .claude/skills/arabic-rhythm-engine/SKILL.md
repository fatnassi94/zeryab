---
name: arabic-rhythm-engine
description: Model and play Arabic iqa'at (rhythmic cycles) — dum/tak/ka strokes, accents, subdivisions, tempo ranges, repetition, variations — plus a configurable rhythm editor and sample-accurate metronome. Use when representing, displaying, editing, teaching or playing rhythmic cycles (maqsum, baladi, sa'idi, wahda, samai thaqil, Tunisian iqa'at…).
---

# Arabic rhythm engine

**Pure data + scheduling helpers** in `src/lib/music/rhythm/*`; audio via `audio-engine-architecture`. Starter cycles: [references/iqaat.md](references/iqaat.md) (draft, needs teacher review).

**Used by:** `maqam-midi-composer`, `arabic-arrangement-and-mixing`, lesson pages (the `rhythms.pattern` jsonb column already exists).

## Model
```ts
type Stroke = "dum" | "tak" | "ka" | "rest" | "slap" | string;   // extensible per instrument
type RhythmEvent = { pulse: number; stroke: Stroke; accent?: 0 | 1 | 2; hand?: "R" | "L" };
type Iqa = { id: string; names: Localized; pulses: number; pulseUnit: 4 | 8 | 16;   // e.g. 10 pulses of eighths
  grouping?: number[];                       // e.g. [3,2,2,3] for samai thaqil (if the teacher teaches it that way)
  events: RhythmEvent[]; tempoRange?: [number, number];
  variations?: { id: string; events: RhythmEvent[] }[]; tradition: string; provenance: Provenance };
```
Store the **skeleton** (core dum/tak) separately from **fills/variations** (tak-ka ornamentation).

## Metronome / playback
- Schedule ahead with a lookahead loop (≈ 25 ms timer, 100 ms window) on the AudioContext clock, or `Tone.Transport` — never `setInterval` for the sounds themselves.
- Swing/feel per iqa' as microtiming offsets (ms or fraction of pulse), configurable.
- Count-in, accent first pulse of cycle, mute layers (skeleton only / with fills).
- Visual: circular cycle (pulses around a ring, current pulse lit) synced to audio time — accessible fallback text "pulse 3 of 10".

## Editor
- Grid of pulses × stroke lanes; click/keyboard to place strokes; validate events within `pulses`.
- Save to `rhythms.pattern` jsonb; the editor writes provenance (who, when).

## Failure modes
- Encoding only time signature (10/8 says nothing about where dums fall).
- Drift from JS timers; restarting AudioContext per play.
- Assuming one "correct" pattern — store variants and tradition.

## Acceptance criteria
- Scheduler drift < 1 ms over 5 minutes at 120 BPM (measure scheduled vs. `currentTime`).
- Starter cycles reviewed by a club percussionist before `status: reviewed`.
- Editor round-trips patterns to the DB without loss.
