---
name: arabic-arrangement-and-mixing
description: Arrange and mix multi-track pieces — melody, drone, bass, iqa' percussion and instrument tracks — with per-track volume, pan, EQ, reverb sends, compression, mute/solo, loop regions, master bus, metering, and stem/stereo export. Use when building the arrangement editor, mixer UI, accompaniment generation, or effect chains.
---

# Arabic arrangement and mixing

**Depends on:** `audio-engine-architecture`, `arabic-instrument-synthesis`, `maqam-midi-composer`, `arabic-rhythm-engine`. **Exports via:** `audio-export-and-rendering`.

## Arrangement rules (starter — refine with teachers)
- **Melody** from the composer; optional **heterophony**: a second instrument plays the same line with small, seeded timing and ornament differences (characteristic of takht ensembles) rather than Western harmony.
- **Drone** on tonic (and optionally ghammaz) for teaching contexts; off by default for performance-style arrangements.
- **Bass/doubling**: octave-lower doubling on cadences, not functional harmony.
- **Percussion** from the iqa' engine: skeleton on darbuka/riq, fills on variation bars.
- Never add chords that imply 12-TET triads over microtonal degrees unless explicitly requested and labelled.

## Mixer model
```ts
type ChannelStrip = { gainDb: number; pan: number; mute: boolean; solo: boolean;
  eq: { lowShelfDb: number; midFreq: number; midDb: number; midQ: number; highShelfDb: number };
  sendReverb: number; compressor?: { thresholdDb: number; ratio: number; attack: number; release: number } };
type Mix = { tracks: Record<TrackId, ChannelStrip>; master: { gainDb: number; limiterCeilingDb: number }; reverbIr: string };
```
- Solo logic: if any track is soloed, non-soloed tracks are muted (implicit mute), mute overrides solo.
- Reverb: convolution with a licensed impulse response (hall/room); IR licence recorded.
- Master: gentle compressor + limiter (ceiling −1 dBFS) to avoid clipping on export.
- Metering: peak + RMS per track and master via `AnalyserNode` (or AudioWorklet for accurate peak), drawn at ≤ 30 fps.

## UI
- Timeline (tracks × bars, grid from iqa'), clips draggable (see `framer-motion-specialist` for drag), loop region, zoom.
- Mixer panel: faders (accessible sliders with dB valuetext), pan knobs as sliders, M/S toggle buttons with `aria-pressed`.
- All changes are data (undoable); audio graph updates with ramps (`setTargetAtTime`) to avoid clicks.

## Failure modes
- Abrupt gain changes causing clicks — always ramp.
- Solo implemented by disconnecting nodes (glitches) instead of gain.
- Effects created per note instead of per track/bus (CPU explosion).

## Acceptance criteria
- Toggle mute/solo during playback without clicks (inspect rendered audio for discontinuities).
- Master never exceeds −1 dBFS on a stress-test arrangement.
- Stems sum (with master bypassed) to the stereo mix within −60 dB residual.
