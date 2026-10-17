---
name: microtonal-tuning-engine
description: Pitch representation beyond 12-tone equal temperament — frequencies, cents, configurable tuning systems (24-EDO, 53-comma, just ratios, per-tradition intonation profiles), reference pitch, and lossless conversion to playback (detune/pitch bend), MIDI and Scala export. Use whenever code turns a note name or scale degree into a sound, a MIDI event, or a cents value.
---

# Microtonal tuning engine

**Never assume Arabic music fits 12-TET.** Every pitch in the system is a precise value in cents/Hz until the very last step that needs something else, and that step must preserve the microtone (detune, pitch bend) or say clearly that it can't.

**Used by:** `arabic-maqam-theory-engine`, `maqam-midi-composer`, `arabic-instrument-synthesis`, `audio-export-and-rendering`, `maqam-audio-analysis`.

## Implemented
`src/lib/music/pitch.ts` (cents↔Hz, `toMidi` note+detune, `pitchBendValue`), `tuning.ts` (`theoretical`, `edo24`, `edo53`, `profile()` per-degree offsets), `scala.ts` (`toScl`). Tests: `src/lib/music/pitch.test.ts`.

## Model
```ts
type Pitch = { cents: number };                 // absolute cents above C0 (C0 = 16.3516 Hz at A4=440)
const hz = (p: Pitch, a4 = 440) => a4 * 2 ** ((p.cents - 5700) / 1200); // A4 = 5700 cents above C0
type TuningSystem = { id: string; name: Localized; quantize: (cents: Cents) => Cents; offsetFor?: (degree: number) => Cents; provenance: Provenance };
```
- **Reference pitch** configurable (A4 = 440 default; some ensembles tune differently — the oud/qanun used by the club decides).
- **Tuning systems** (data, not code): `24-edo` (50-cent grid), `53-comma` (≈ 22.64-cent Holdrian comma), `ratios` (just intervals as fractions), `profile:<tradition>` (theoretical system + per-degree offsets measured or set by teachers).
- **Conversion to 12-TET + offset**: `{ midi: Math.round(cents/100) + 12, detuneCents: remainder }` — used only at the playback/MIDI boundary.

## Playback & export boundaries
| Target | How microtones survive |
|---|---|
| Web Audio sampler | `AudioBufferSourceNode.detune` (cents) or `playbackRate`; smplr's per-note `detune` |
| Oscillator synth | Set `frequency` directly in Hz |
| MIDI file | Pitch bend per note → **one sounding note per channel** (rotate channels 1–9, 11–16; channel 10 is percussion). Write the pitch-bend range (RPN 0) explicitly; default ±2 semitones → 50 cents = bend value 0.25 in `@tonejs/midi` (`track.addPitchBend({ time, value })`, value −1…1). Document it in the file's text/marker event. |
| Notation/teaching | Show cents and the Arabic accidental (½♭ / ½♯) — never silently round |
| Tuning file | Export Scala `.scl` (+ `.kbm`) for hardware/soft synths |

## Workflow
1. Implement pitch math + tests first (known values: A4 = 440 Hz; quarter-tone above A4 ≈ 452.89 Hz; E½♭ on C = 350 cents).
2. Implement tuning systems as data with provenance; add a per-degree offset editor later for teachers.
3. Build the converters (detune, pitch bend, Scala) with round-trip tests.
4. Expose a single `resolvePitch(maqamVariant, degree, octave, tuningSystem, referenceA4)`.

## Failure modes
- Rounding to the nearest semitone in composer or MIDI writer.
- Polyphonic microtonal notes sharing a MIDI channel (pitch bend is per channel → wrong pitches).
- Forgetting to reset pitch bend before the next note on a reused channel.
- Assuming the receiver's bend range; not writing RPN.

## Acceptance criteria
- Unit tests: cents↔Hz within 0.01 Hz; 24-EDO and 53-comma degree tables; MIDI round-trip via `@tonejs/midi` preserves cents within ±1 cent (bend resolution 14-bit over ±200 cents ≈ 0.024 cents/step).
- A rendered quarter-tone test tone measures within ±2 cents of target (pitch detector from `maqam-audio-analysis`).
