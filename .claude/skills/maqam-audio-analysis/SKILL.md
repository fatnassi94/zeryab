---
name: maqam-audio-analysis
description: Analyse uploaded or recorded audio for pitch contours, intonation in cents relative to a tonic, timing, rhythm and ornaments, with confidence scores and mandatory human review. Use when building pitch tracking, practice feedback, maqam-hint features or transcription aids; never to claim automatic maqam identification or perfect transcription.
---

# Maqam audio analysis

Analysis produces **evidence for a human**, not verdicts. Every output carries confidence and the UI says so. (This matches the project spec: no automatic maqam recognition in v1.)

**Depends on:** `microtonal-tuning-engine` (cents), `arabic-maqam-theory-engine` (degree grids), `canvas-audio-visualization` (pitch trace UI).
**Libraries:** `pitchy` (MIT, McLeod pitch method — monophonic f0), `meyda` (MIT, spectral features/onsets). `essentia.js` is **AGPL-3.0** — do not use in the web app unless the club accepts AGPL obligations; server-side use still needs legal review.

## Capabilities (in order of reliability)
1. **Pitch contour** (monophonic voice/nay/violin/oud single line): f0 per 10–20 ms frame + clarity; convert to cents above a user-confirmed tonic.
2. **Intonation histogram**: weighted pitch-class histogram in cents (bin 5–10 cents) → peaks compared to a chosen maqam variant's degrees → "your sikah is 18 cents lower than the reference" with confidence.
3. **Onsets/tempo**: spectral-flux onsets → inter-onset intervals → tempo estimate; align against an iqa' grid when the user selects one.
4. **Ornament hints**: rapid oscillations in f0 (trill/vibrato rate & depth) — informative only.
5. **Maqam *suggestions*** (later, optional): ranked candidates from histogram similarity, shown as "possible", never as identification; teacher confirmation required.

## Workflow
1. Run analysis in a Web Worker (or server job for long files); resample to 16–22 kHz mono.
2. Ask the user for (or confirm) the tonic; analysis relative to a wrong tonic is meaningless.
3. Gate frames by clarity/energy; report the fraction of usable frames.
4. Present results with confidence bands and the underlying plot; allow teacher annotations stored with the recording.
5. Store results versioned (`analysis_version`, parameters) so they can be recomputed.

## Failure modes
- Running monophonic pitch trackers on ensemble recordings and presenting output as reliable.
- Octave errors (f0 halving/doubling) not corrected by continuity constraints.
- Comparing to 24-TET only — compare to the selected tradition's intonation profile.
- Uploads: personal recordings are private data — `media-private` bucket and RLS.

## Acceptance criteria
- Synthetic test set: tones at known cents (e.g. 0, 150, 350) detected within ±3 cents at clarity > 0.9.
- Real test set annotated by a teacher; report precision/recall for onsets and median cents error for degrees.
- UI never uses words like "detected maqam: X" without "possible" and confidence.
