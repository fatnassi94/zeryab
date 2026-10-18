---
name: arabic-instrument-synthesis
description: Extensible instrument playback for oud, qanun, nay, violin, riq, darbuka and others — sampled instruments with velocity layers, articulations, release, round-robin and per-note microtonal detune, plus clearly labelled synthesis fallbacks. Use when adding an instrument sound, choosing or licensing samples, or building the instrument abstraction used by the composer and mixer.
---

# Arabic instrument synthesis

## Current state (phase 5)
Only synthesised voices exist (`src/lib/audio/voices.ts`): melody instruments `INSTRUMENTS = { oud: pluck, qanun, nay, violin }` (saw+triangle pluck; three detuned saws for qanun courses; sine partials + breath noise for nay; sawtooth through body peaks for violin — vibrato only after the attack so onsets stay exact), plus drone and dum/tak/ka. Labelled "approximation / صوت تقريبي" in the lab. `Player.play(t, mix, instrument)`, `renderOffline(t, { instrument })`, `previewNote(freq, instrument)` (click-to-hear). Sampled instruments replace these behind the same timeline → voice interface in phase 6.

**Honesty rule:** General MIDI soundfonts have no real oud, qanun, nay or riq. Never label a GM sitar/koto patch "oud". Either use real samples (best: recorded from the club's musicians, with written consent and licence) or a synthesis model labelled as an approximation ("صوت تقريبي / approximation").

**Depends on:** `microtonal-tuning-engine` (detune), `audio-engine-architecture` (graph, scheduling). **Used by:** `arabic-arrangement-and-mixing`, `audio-export-and-rendering`.
**Candidate libraries:** `smplr` (MIT; sampler with per-note `detune`, velocity, scheduling, caching) or Tone.js `Sampler`/`Player`; custom AudioWorklet for physical models. Not installed.

## Instrument interface
```ts
interface Instrument {
  id: string; name: Localized; kind: "sampled" | "synth"; licence: LicenceInfo; // source, licence, attribution, consent
  load(ctx: BaseAudioContext, onProgress?: (p: number) => void): Promise<void>;
  playNote(e: { time: number; cents: number; durationSec: number; velocity: number; articulation?: string }): void;
  stopAll(time?: number): void; output: AudioNode; dispose(): void;
}
```
Works with both `AudioContext` (live) and `OfflineAudioContext` (export) — no hidden global context.

## Sample library spec (for recording sessions with club musicians)
- 48 kHz / 24-bit WAV masters → web delivery as Opus/AAC or OGG + MP3 fallback.
- Pitch coverage: every 2–3 semitones across the instrument's range; detune covers the gaps (keep detune ≤ ±150 cents to avoid artefacts) — or record the actual maqam degrees for the most-used maqamat.
- Velocity layers: 3 (soft/medium/strong); round-robin: 2–3 per note for oud/qanun plucks, riq/darbuka strokes.
- Articulations: oud (pluck, tremolo/risha), qanun (pluck, tremolo), nay (sustain with breath attack, separate breath noise), violin (sustain, short), riq (dum, tak, jingles/snouj roll), darbuka (dum, tak, ka, slap).
- Metadata JSON: note → file, root cents, velocity range, loop points (nay/violin sustains), licence.
- Store in Supabase Storage `media-public` only if the licence allows public distribution; otherwise `media-private` with signed URLs.

## Synthesis fallbacks (labelled)
- Plucked strings (oud/qanun): Karplus–Strong in an AudioWorklet with body filter; frequency set in Hz (microtonal by construction).
- Nay: filtered noise + sine/triangle partials with slow vibrato; breath envelope.
- Percussion: sampled one-shots strongly preferred over synthesis.

## Failure modes
- Silent instruments because loading wasn't awaited before scheduling; no progress UI.
- Memory blow-up: decoding every sample up front — lazy-load per instrument/range.
- Licences unknown → cannot ship. Keep a `LICENSES.md` for samples.

## Acceptance criteria
- Each instrument plays a test scale in Bayati with measured pitch within ±5 cents of the tuning engine's targets.
- Load size per instrument ≤ 5 MB for web; progress reported.
- Licence and attribution displayed in an "about sounds" panel.
