---
name: audio-engine-testing
description: Test strategy for the music and audio stack — unit tests for pitch/tuning math, maqam data and composer determinism; offline-render tests for frequencies, timing, synchronisation and exports; browser tests for playback states and failures. Use when adding or changing anything under the maqam, tuning, rhythm, composer, audio engine or export code.
---

# Audio engine testing

**Covers:** `microtonal-tuning-engine`, `arabic-maqam-theory-engine`, `arabic-rhythm-engine`, `maqam-midi-composer`, `audio-engine-architecture`, `audio-export-and-rendering`, `arabic-instrument-synthesis`.
**Tools:** Vitest 5 (`npm test`, config `vitest.config.mts`, tests in `src/**/*.test.ts`) and Playwright (`@playwright/test`) for in-browser audio (OfflineAudioContext runs in Chromium). Both are devDependencies. Pitch, tuning, Scala, maqam and rhythm layers already have unit tests; verify new tests can fail (mutate the data once) before trusting them.

## Layers
1. **Pure unit tests (Vitest, fast)**
   - cents ↔ Hz (A4 = 440; +50 cents ≈ 452.89 Hz), 24-EDO and 53-comma tables, Scala output.
   - Maqam data validation for every shipped variant (degree counts, monotonicity, octave/non-octave rules, provenance present).
   - Rhythm patterns: events within cycle, groupings sum to pulses.
   - Composer: seed → snapshot; all notes are valid degrees; phrase cadences on allowed degrees.
   - MIDI: write → read with `@tonejs/midi`, compare notes, times, bends (±1 cent).
2. **Offline render tests (Playwright page, OfflineAudioContext)**
   - Render a single synthesized note at a microtonal target → estimate f0 (autocorrelation / pitchy) → within ±2 cents.
   - Render a metronome at 120 BPM for 60 s → onset times vs expected within ±1 ms (sample-index based).
   - Two tracks scheduled together → cross-correlation lag = 0 samples.
   - Export: WAV header fields, length, peak ≤ −1 dBFS with limiter.
3. **Playback behaviour (Playwright, real AudioContext)**
   - Suspended context until user gesture; play → playing state; rapid play/stop ×100 → one active voice set; navigation disposes nodes (no console errors, memory stable via `performance.memory` where available).
   - Failure states: sample 404, expired signed URL, decode error → visible error message and recoverable UI.

## Fixtures
- `tests/fixtures/audio/`: generated tones (sine at known cents), clicks at known times, a short licensed oud phrase for regression. Generate synthetic fixtures in code; avoid committing large files.

## Acceptance criteria
- `npm test` runs unit layer < 10 s; render tests run in CI on Chromium.
- Any change to tuning, maqam data or composer requires updated snapshots reviewed by a human (and a teacher for data changes).
