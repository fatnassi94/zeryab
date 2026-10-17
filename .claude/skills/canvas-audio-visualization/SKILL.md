---
name: canvas-audio-visualization
description: Real-time and pre-computed audio visuals on Canvas 2D — waveforms from decoded audio, spectrum/frequency bars, spectrograms, pitch traces and playheads synchronised with playback via the Web Audio API. Use when drawing any visual that represents actual audio; never for decorative fake waveforms.
---

# Canvas audio visualization

Rule zero: **a visual that looks like audio must be derived from the audio it accompanies.** The home page's "locked library" bars are explicitly decorative (blurred, non-interactive, `aria-hidden`); anything playable must show real data.

**Depends on:** `audio-engine-architecture` (shared AudioContext, analyser taps). **Used by:** `pro-audio-player-ui`, `maqam-audio-analysis`. **Perf:** `web-animation-performance`.

## Techniques
| Visual | Source | Notes |
|---|---|---|
| Static waveform | `decodeAudioData` → min/max peaks per pixel bucket | Compute once, cache peaks in Storage/DB as JSON next to the recording (`<path>.peaks.json`) so lists don't decode full files |
| Live spectrum | `AnalyserNode.getByteFrequencyData` | `fftSize` 2048, `smoothingTimeConstant` ~0.8; log-scale the x axis for music |
| Spectrogram | Successive FFT frames drawn as columns | Use an offscreen canvas; scroll by `drawImage` shifting, not redrawing everything |
| Pitch trace | Pitch detector (see `maqam-audio-analysis`) | Plot cents relative to the maqam tonic; draw scale-degree guide lines from the tuning engine |
| Playhead | `currentTime` of the media/AudioContext | Animate with rAF; never from React state updates |

## Workflow
1. One `<canvas>` per visual; size with `ResizeObserver`; scale backing store by `devicePixelRatio` (cap at 2).
2. Preallocate typed arrays; no allocations inside the draw loop.
3. Pause the rAF loop when the element is offscreen or audio is paused.
4. Colours from tokens (gold = played/selected, muted = remaining, teal = reference/pitch guides).
5. Direction: time runs in reading direction? **No** — audio time is conventionally left→right in all locales; keep waveforms LTR inside RTL pages (wrap in `dir="ltr"`) and label start/end with times so it's unambiguous. Document this choice in the component.
6. Accessibility: canvas has `role="img"` + `aria-label` summary, or is `aria-hidden` when an accessible slider conveys the same info.
7. Peak generation for uploads can run in a Web Worker (or server-side later) to avoid blocking the UI.

## Failure modes
- Random or sine-generated "waveforms" presented as real.
- Creating a new AudioContext per component (browser limits; autoplay policy).
- Analyser connected after the gain node at zero volume → flat display while muted (tap before master gain if you want visuals while muted).

## Acceptance criteria
- Waveform of a known test file (silence → 1 kHz tone → silence) shows the tone in the correct region.
- Spectrum peak of a 440 Hz sine lands in the correct bin (± 1 bin).
- CPU < 10% on a laptop for a live spectrum; loop stops when hidden.
