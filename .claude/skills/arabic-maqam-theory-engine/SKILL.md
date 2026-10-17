---
name: arabic-maqam-theory-engine
description: Data model and logic for Arabic maqamat — ajnas, scale degrees with microtonal intervals, tonic/ghammaz, ascending vs descending forms, melodic pathways (sayr), characteristic phrases, modulations and regional (Mashriqi, Tunisian/Maghrebi) variants, all configurable and reviewable by musicians. Use when modelling, displaying, teaching or generating music from maqamat (Rast, Bayati, Hijaz, Nahawand, Saba, Kurd, Ajam, Sikah…).
---

# Arabic maqam theory engine

The engine is **pure TypeScript, no audio, no UI**. Implemented:
- `src/lib/music/notes.ts` — Arabic tone table (Rast=C … Muhayyar, Buzurk) with stored spelling; `westernName()` per locale.
- `src/lib/music/maqam/{types,engine}.ts`, data in `maqam/data/{ajnas,maqamat}.ts` — degrees stored **by tone name**, cents derived.
- Engine: `validateVariant`, `degreesOf`, `ajnasAt`, `nearestDegree` (signed deviation), `resolvePitch` (tuning + profile offsets), `modulationCandidates`, `toLessonFields` (`scale_notes`, `ajnas` with `start`, `ghammaz` — consumed by the lesson page).
- Tests: `maqam/engine.test.ts` holds the human-readable reference table. Run `npm test`.

**Depends on:** `microtonal-tuning-engine` (pitch values). **Used by:** `maqam-midi-composer`, `arabic-instrument-synthesis`, lesson pages, `maqam-audio-analysis`. Starter data: [references/maqam-data.md](references/maqam-data.md).

## Core principles
1. **Theory ≠ practice.** Store the *theoretical* definition (e.g. 24-tone positions) separately from *performance intonation* profiles (e.g. a Tunisian sikah sitting lower than the 24-TET half-flat). Both are data, both are reviewable.
2. **Everything is configurable data with provenance**: each maqam/jins/variant records `source`, `tradition`, `reviewedBy`, `reviewedAt`, `status: draft|reviewed`. Unreviewed data is labelled as such in the UI.
3. **No claim of completeness.** The club's teachers define which maqamat and variants are taught; the engine supports adding them without code changes.

## Model (TypeScript sketch)
```ts
type Cents = number;                       // relative to the maqam tonic
type Jins = { id: string; names: Localized; intervals: Cents[]; /* steps, e.g. bayati [150,150,200] */ };
type JinsPlacement = { jinsId: string; startDegree: number };        // 0-based degree index
type MaqamVariant = {
  id: string; tradition: "mashriqi" | "tunisian" | "turkish" | string;
  tonic: PitchName;                        // e.g. "D" (Dukah)
  ascending: Cents[]; descending?: Cents[];// absolute cents from tonic, one octave+
  lower: JinsPlacement; upper: JinsPlacement[];                       // alternatives allowed
  ghammaz: number;                         // degree index of the dominant
  sayr: SayrStep[];                        // ordered melodic path: { degreeRange, emphasis, cadence? }
  phrases?: PhraseRef[];                   // documented characteristic phrases (with recording refs)
  intonation?: Record<number, Cents>;      // per-degree performance offsets (practice profile)
  provenance: Provenance;
};
```
Degree names come with Arabic tone names (Rast, Dukah, Sikah, Jaharkah, Nawa, Husayni, Awj, Kirdan…) and Western approximations ("E half-flat"), stored in all three locales.

## Workflow
1. Implement `jins` and `maqam` types + validation (octave closure, monotonic degrees, ghammaz within range).
2. Load data from JSON in the repo first (`src/lib/music/maqam/data/*.json`); later mirror into Supabase (`maqamat.scale_notes/ajnas` already exist) once the editor UI exists.
3. Provide queries: `degreesOf(variant, direction)`, `jinsAt(variant, degree)`, `nearestDegree(cents)`, `modulationCandidates(variant)` (shared ajnas on common degrees).
4. Map to the lesson UI: `maqamat.scale_notes` uses `"Arabic|Western"` strings and `ajnas` uses `[{ name, notes }]` — generate those from the engine instead of hand-typing.
5. Unit-test every maqam: degrees count, octave = 1200, jins intervals sum, ascending/descending differences.

## Failure modes
- Treating 24-TET as truth; rounding microtones to semitones anywhere in the pipeline.
- One flat list of notes per maqam (loses ajnas, direction, sayr).
- Hard-coding Mashriqi forms as "the" maqam for a Tunisian club.

## Acceptance criteria
- Engine has no DOM/audio imports; 100% of shipped maqam data has provenance; a teacher can review a diff of JSON data.
- Tests pass for Rast, Bayati, Hijaz, Nahawand, Saba, Kurd, Ajam, Sikah starter data.
