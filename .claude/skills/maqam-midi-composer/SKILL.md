---
name: maqam-midi-composer
description: Deterministic, rule-based composition of editable musical sequences in a maqam — notes, durations, rests, ornaments, phrases following the sayr, variations, iqa'-aware rhythm placement — with MIDI export that preserves microtones. Use when generating melodies or exercises from maqam/iqa' rules, building the sequence data model, or exporting compositions to MIDI.
---

# Maqam MIDI composer

A **rule-based, seeded, editable** composer comes before any AI generation. Same inputs + same seed ⇒ identical output.

**Depends on:** `arabic-maqam-theory-engine`, `microtonal-tuning-engine`, `arabic-rhythm-engine`. **Consumed by:** `audio-engine-architecture` (playback), `audio-export-and-rendering` (MIDI/WAV).
**Library:** `@tonejs/midi` (MIT) for MIDI read/write (supports notes, CC, pitch bends). Not installed yet.

## Sequence model (engine-agnostic, in `src/lib/music/sequence/*`)
```ts
type NoteEvent = { id: string; startBeat: number; durationBeats: number;
  degree: number; octave: number;          // maqam-relative, not MIDI numbers
  velocity: number;                        // 0..1
  ornament?: "trill" | "mordent" | "slide" | "grace"; ornamentTarget?: number; };
type Phrase = { id: string; notes: NoteEvent[]; role: "opening" | "development" | "cadence"; sayrStep: number };
type Composition = { maqamVariantId: string; tuningId: string; iqaId: string; tempoBpm: number;
  seed: number; phrases: Phrase[]; tracks: TrackRef[]; version: 1 };
```
Notes stay **degree-based**; pitch is resolved at playback/export time by the tuning engine, so changing tuning never rewrites the score.

## Generation rules (initial set — refine with teachers)
1. Seeded PRNG (e.g. mulberry32) — no `Math.random`.
2. Follow the variant's `sayr`: open around the tonic or the documented starting area, develop toward the ghammaz, visit upper ajnas as the sayr allows, cadence on the tonic (or the variant's documented cadence degrees).
3. Mostly stepwise motion within a jins; leaps ≤ a fourth, resolved by step in the opposite direction.
4. Respect direction-dependent degrees (ascending vs descending forms, e.g. Nahawand B vs B♭).
5. Rhythm: place phrase starts and long notes on the iqa''s strong strokes (dum); phrase lengths in whole cycles.
6. Ornaments are explicit events (not baked into pitch), so they can be toggled.
7. Output also includes a human-readable explanation per phrase ("cadence on Dukah via Sikah") for teaching.

## Editing
- All operations are pure functions on `Composition` (insert/move/transpose-by-degree/change-duration), enabling undo/redo and tests.
- Snap to the iqa' grid (subdivision from the rhythm engine).

## MIDI export
- Map degrees → cents → `{ midi, detuneCents }`; write one sounding note per channel with pitch bend before note-on (see `microtonal-tuning-engine`).
- Tracks: melody, drone (tonic/ghammaz), percussion (channel 10, GM percussion keys mapped from dum/tak), with tempo and time-signature meta events; add a marker naming maqam, tuning and bend range.
- MIDI is **data**, not audio — UI must say "MIDI (for notation/DAW)" vs "Audio (WAV)".

## Acceptance criteria
- Snapshot tests: fixed seed → byte-identical MIDI.
- Every generated note is a valid degree of the chosen variant/direction.
- Exported MIDI reopened with `@tonejs/midi` reproduces notes, durations and cents (±1 cent).
- A teacher can listen to 10 generated phrases per maqam and mark each acceptable/not — track the acceptance rate before expanding rules.
