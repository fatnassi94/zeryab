---
name: audio-engine-architecture
description: Architecture of the browser audio engine — one shared AudioContext, separated layers for scheduling, instruments, tracks, effects, playback state and export, glitch-free lookahead scheduling, lifecycle and memory management. Use when starting any audio feature (player, metronome, composer playback, mixer, export) or when debugging glitches, duplicated playback, drift or leaks.
---

# Audio engine architecture

## Implemented (phase 5)
- Raw Web Audio (no Tone.js yet): exact Hz per voice keeps microtones trivially; the same `buildGraph` serves live and offline rendering.
- `src/lib/audio/voices.ts` (synthesised `pluck`, `drone`, `drum` — labelled approximations in the UI), `src/lib/audio/engine.ts` (`buildGraph`, `renderOffline`, shared `getAudioContext`, `Player` with 25 ms / 150 ms lookahead, idempotent `play`, click-free `stop`, live `setMix`).
- Measured: master `DynamicsCompressorNode` adds a **constant ~6.5 ms** look-ahead latency in Chromium (all tracks equally, jitter < 0.5 ms). Account for it when aligning visuals to audio; don't "fix" it per track.
- `npm run check:audio` (`scripts/audio-check.mjs`): bundles the engine with Vite, renders in Chromium, measures pitch of every scale note (±3¢ gate; currently ±0.5¢), clipping, silence, drum jitter — for **every melody instrument** — and renders the MusicXML test fixture through `scoreTimeline` (drone + iqaʿ).
- Imported scores reuse the same path: `scoreTimeline(score, …)` returns the composer's timeline shape, so Player, offline render and voices are shared.

**Hub skill** for audio. **Uses:** `microtonal-tuning-engine`, `arabic-instrument-synthesis`. **Used by:** `pro-audio-player-ui`, `arabic-arrangement-and-mixing`, `audio-export-and-rendering`, `arabic-rhythm-engine` playback. **Tested by:** `audio-engine-testing`.

## Technology choice
- **Tone.js 15** (MIT): Transport, scheduling, `Tone.Offline` rendering, effects — good default for the composer/mixer.
- **Raw Web Audio** for the simple recording player (an `<audio>` element / `MediaElementAudioSourceNode` is enough, no Tone needed).
- **AudioWorklet** only for custom DSP (Karplus–Strong, meters if needed).
Don't mix two transports. One engine instance per page.

## Layers (folder `src/lib/audio/*`, client-only)
```
engine/context.ts      // getAudioContext(): lazy singleton; resume() on first user gesture
engine/scheduler.ts    // transport: tempo, position (beats), loop, lookahead scheduling
engine/instruments/    // Instrument implementations (see arabic-instrument-synthesis)
engine/tracks.ts       // Track = instrument + events + channel strip (gain, pan, sends, mute/solo)
engine/effects.ts      // EQ, compressor, reverb (convolution) — shared bus + per-track
engine/state.ts        // playback state machine: idle → loading → ready → playing ↔ paused → stopped
engine/render.ts       // offline render using the same graph builder (export)
```
- **Composition data** (from `maqam-midi-composer`) is immutable input; the engine compiles it to scheduled events. UI never schedules sounds directly.
- **Graph builder is a pure function of (composition, mix settings, context)** so live and offline rendering produce the same sound.

## Rules
1. Create/resume the AudioContext only after a user gesture (autoplay policy); show a "tap to enable sound" state if suspended.
2. Schedule against `ctx.currentTime` (or Tone.Transport) with lookahead; never trigger sounds from `setTimeout`/React effects.
3. Single playback controller: starting playback stops/clears the previous schedule (prevents duplicated playback after HMR, re-renders or double clicks — make `play()` idempotent).
4. Dispose nodes/buffers on unmount and route changes; keep decoded buffers in an LRU cache with a byte budget.
5. React integration through a small store (e.g. `useSyncExternalStore`) exposing state, not nodes; position for UI read via rAF from the engine.
6. Visibility: keep audio playing in background tabs, but stop visual loops.

## Failure modes
- Multiple AudioContexts (one per component) → limits, memory, unsynchronised clocks.
- React strict mode mounting twice → two schedulers; guard with singleton + idempotent start.
- Timing drift from accumulating float beats; compute event times from absolute beat positions.
- Leaks from un-disconnected nodes in long sessions.

## Acceptance criteria
- Play/stop 100 times rapidly: never more than one voice per scheduled note, memory returns to baseline.
- Drift < 1 ms over 5 min (see `audio-engine-testing`).
- Live playback and offline render of the same composition differ by < −60 dBFS residual (same graph).
