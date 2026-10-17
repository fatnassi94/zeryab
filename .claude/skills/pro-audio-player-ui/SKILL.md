---
name: pro-audio-player-ui
description: Interactive audio player for recordings and lessons — real waveforms, seeking, A–B looping, playback speed with pitch preservation, playlists, A/B comparison between two recordings, synchronised lesson notes/markers, keyboard and screen-reader support. Use when building or upgrading any listening UI beyond the basic AudioButton.
---

# Pro audio player UI

Current state: `AudioButton` (`src/components/audio-button.tsx`) — single-track play/pause, one track at a time. The pro player replaces it where learning needs more control (lessons, library detail, practice).

**Depends on:** `audio-engine-architecture`, `canvas-audio-visualization`, `design-system-architecture`, `accessibility-audit`.
**Option:** `wavesurfer.js` (v8, BSD-3) provides waveform + regions; acceptable if it fits the design. Otherwise a custom canvas waveform using precomputed peaks.

## Features (priority order)
1. Play/pause, seek (click/drag/keyboard), time + duration, buffered state, loading & error states.
2. **A–B loop** with draggable handles and numeric fine-tuning; "repeat N times" for practice (lesson design shows a "تكرار" button).
3. **Speed** 0.5–1.25× with `preservesPitch = true` on the media element (default true in modern browsers) — essential so maqam intonation isn't shifted.
4. Markers / synchronised notes: timestamps from the lesson (e.g. "jins Bayati on Dukah", "modulation to Rast on Nawa") highlighted during playback and clickable.
5. Playlist: next/previous, autoplay next (opt-in), remembers position per track (localStorage, per-user convenience).
6. **A/B comparison**: two recordings (e.g. teacher vs student, two interpretations) with sync toggle and instant switch at the same timestamp.
7. Signed URLs for private files (`mediaUrls()` in `src/lib/data/media.ts`); refresh when expired (on error 400/403 → refetch URL server action).

## Accessibility
- Seek bar is a real slider: `role="slider"` with `aria-valuemin/max/now` and `aria-valuetext` ("1:23 of 4:10"), arrow keys ±5 s, Page keys ±30 s, Home/End.
- Space toggles play when the player has focus (not globally). Labels from dictionaries.
- Waveform canvas is `aria-hidden`; the slider carries the info.

## Direction
Timeline runs left→right (time convention) inside `dir="ltr"` even on Arabic pages; controls around it follow the page direction. Label start/end times.

## Failure modes
- Decoding entire long recordings in the browser just to draw a waveform → use stored peaks.
- Speed change shifting pitch (would mislead maqam learning).
- Multiple players playing at once (reuse the "pause others" pattern from `AudioButton`).

## Acceptance criteria
- Keyboard-only: load, play, seek, loop, change speed.
- A–B loop accurate to ±20 ms over 50 repetitions.
- Works with an expired signed URL (auto-refresh) and offline-cached lessons (PWA).
