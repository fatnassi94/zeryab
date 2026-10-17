---
name: audio-export-and-rendering
description: Validated export paths — offline rendering to WAV (stereo mix and stems) via OfflineAudioContext/Tone.Offline, MIDI files with microtonal pitch bends, Scala tuning files and metadata — preserving sample rate, channels, timing and tuning. Use when implementing any download/export of compositions or arrangements, or verifying exported files.
---

# Audio export and rendering

Two different things, always labelled differently in the UI:
- **Audio (WAV)** — what it sounds like, rendered from the instruments.
- **MIDI** — editable note data for notation software/DAWs; sounds depend on the receiver's instruments.

**Depends on:** `audio-engine-architecture` (shared graph builder), `microtonal-tuning-engine`, `maqam-midi-composer`. **Tested by:** `audio-engine-testing`.

## WAV
1. Build the same graph in an `OfflineAudioContext(channels=2, length=ceil((duration+tail)*sr), sampleRate=48000)` (or `Tone.Offline`). Include reverb tail (≥ 2 s) and wait for all instrument samples to load in that context.
2. `startRendering()` → `AudioBuffer`; encode WAV (RIFF, PCM 16-bit or 24-bit integer, or 32-bit float) with a small, tested encoder (write your own ~60 lines, or a maintained MIT package; verify output with a WAV parser in tests).
3. Stems: render each track solo (master effects bypassed or "printed" per policy) with identical length so they align at 0.
4. Metadata: INFO chunk (title, artist = club, comment = maqam/iqa'/tuning/A4) — and a sidecar JSON.
5. Render in a Worker-friendly way for long pieces; show progress (rendering is faster than real time but can still take seconds).
6. Offer MP3/Opus only via a verified encoder (WebCodecs `AudioEncoder` where supported); WAV is the reference format.

## MIDI
- `@tonejs/midi`: tempo, time signature, track names, notes; microtones via per-note channel rotation + pitch bend (see `microtonal-tuning-engine`), RPN bend-range messages, and a text/marker event documenting maqam, tuning and bend range.
- Percussion on channel 10 with a documented stroke→key map.

## Scala
- `.scl` for the tuning (cents per degree) + `.kbm` mapping for the chosen tonic; include provenance in the description line.

## Failure modes
- Rendering with the live `AudioContext` graph objects (they can't move between contexts) — rebuild via the graph builder.
- Resampling surprises: render at 48 kHz, state it; never silently change sample rate.
- Clipping in export (master limiter missing) — check peak before encoding and warn.
- Leading silence from late sample loading; trailing reverb cut off.

## Acceptance criteria
- Exported WAV parses with correct header (channels, rate, bit depth, length = expected ±1 frame).
- MIDI re-import reproduces notes and cents within ±1 cent; percussion on channel 10.
- Same composition + seed ⇒ byte-identical MIDI and sample-identical WAV (given same samples).
