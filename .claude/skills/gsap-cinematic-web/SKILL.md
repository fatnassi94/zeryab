---
name: gsap-cinematic-web
description: Cinematic timelines and scroll storytelling with GSAP 3 and @gsap/react (useGSAP) in Next.js — sequenced hero entrances, ScrollTrigger scenes, SVG draw/morph, text splitting, audio-synchronised sequences. Use for multi-step or scroll-scrubbed animation on landing/story pages; not for simple hover or presence animations.
---

# GSAP cinematic web

**Packages:** `gsap` (3.15, all plugins incl. ScrollTrigger, SplitText, DrawSVG, MorphSVG ship in the main package under GSAP's no-charge standard license) and `@gsap/react` (`useGSAP`). Not installed yet.
**Follows:** `motion-design-system`. **Perf/a11y:** `web-animation-performance`, `accessibility-audit`.

## When to use
- Hero entrance sequences (scene → headline → CTA → next-concert card).
- Scroll stories: "the history of the club", "how a nouba unfolds", maqam journeys.
- SVG line drawing (oud rosette, notation reveal), morphing between rhythm-cycle shapes.
- Animation locked to audio playback (score-follow highlights).

## Workflow
1. Client component with `useGSAP(() => { ... }, { scope: containerRef })` — automatic cleanup via `gsap.context`, safe with React strict mode.
2. Register plugins once in a client module: `gsap.registerPlugin(ScrollTrigger, SplitText)`.
3. Build with a single `gsap.timeline({ defaults: { ease: "power3.out", duration: 0.6 } })` and labels; keep durations aligned to `motion-design-system` tokens.
4. Wrap everything in `gsap.matchMedia()`:
   - `(prefers-reduced-motion: no-preference)` → full timeline;
   - `(prefers-reduced-motion: reduce)` → `gsap.set` final states only.
   Also branch on `(min-width: 768px)` for heavier scroll scenes.
5. ScrollTrigger: `scrub: true` only for decorative motion; pinned sections must not trap keyboard users or hide content from screen readers. Call `ScrollTrigger.refresh()` after fonts load (`document.fonts.ready`).
6. RTL: x offsets and `start/end` horizontal triggers flip for `dir="rtl"`.
7. SplitText on Arabic: split by **words or lines only** — splitting Arabic into characters breaks letter joining. Use `aria` options (SplitText adds `aria-label` to the parent by default) and revert on cleanup.
8. Audio sync: drive `timeline.progress()` or `.seek(seconds)` from the audio clock in a `requestAnimationFrame` loop; pause the timeline when audio pauses.

## Failure modes
- Animations created outside `useGSAP` leak on navigation.
- ScrollTrigger measurements taken before web fonts load → wrong start positions.
- Character-splitting Arabic; animating `width/left/top` instead of transforms.
- Server rendering the "from" state invisible (opacity 0 in CSS) → blank content without JS. Prefer `gsap.from` so SSR HTML is the final state.

## Acceptance criteria
- Sequence total ≤ 1.5 s for heroes; content readable and clickable before it ends.
- With JS disabled or reduced motion, all content is visible.
- 60 fps on a mid-range Android phone (Chrome DevTools 4× CPU throttle).
