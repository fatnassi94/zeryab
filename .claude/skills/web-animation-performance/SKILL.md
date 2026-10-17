---
name: web-animation-performance
description: Keep animations smooth and cheap — compositor-only properties, frame budgets, layer management, battery and mobile constraints, measuring jank, and reduced-motion alternatives. Use when adding or reviewing any animation, scroll effect, canvas/WebGL loop, or when the site feels janky or hot on phones.
---

# Web animation performance

**Applies to:** `motion-design-system`, `framer-motion-specialist`, `gsap-cinematic-web`, `canvas-audio-visualization`, `webgl-threejs-experiences`.

## Rules
1. Animate `transform` and `opacity` only. `filter: blur()` and large `box-shadow` animations are expensive — static use is fine (the hero's SVG blur filters are static).
2. Frame budget: 16.7 ms total; keep script per frame < 4 ms. Audio scheduling must never wait on visuals (audio runs on its own clock).
3. `will-change` only during an animation, on few elements; remove afterwards.
4. Pause offscreen work: IntersectionObserver for loops/canvases; `document.visibilityState` for tab switches.
5. SVG loops (rain, waves) animate a `<g>` transform, not path data; pattern fills over large rects are fine but test on low-end phones.
6. Scroll effects use ScrollTrigger/`useScroll` (passive listeners), never `scroll` handlers that read layout.
7. Avoid layout thrash: batch reads then writes; no `offsetWidth` in loops.
8. Respect `prefers-reduced-motion` and also consider `navigator.connection.saveData` for heavy scenes.

## Measuring
- Chrome DevTools Performance panel with 4× CPU throttle; look for long tasks > 50 ms and frames > 16 ms.
- Rendering tab → "Frame rendering stats" and "Paint flashing" on the home hero.
- Lighthouse mobile: performance ≥ 90, TBT < 200 ms, CLS < 0.05.
- Real device check on a mid-range Android + an iPhone before release.

## Common fixes
| Symptom | Fix |
|---|---|
| Hero stutters on phones | Reduce rain pattern layers to one under `max-md`, or pause when hero leaves viewport |
| Scroll jank on story pages | `pin` fewer sections; precompute; use `scrub: 0.5` |
| Canvas eats CPU | Lower FFT size, draw every other frame, stop when hidden |
| React re-renders at 60 fps | Move animated values to refs/MotionValues |

## Acceptance criteria
- No dropped-frame clusters in a 10 s recording of home hero + scroll on 4× throttle.
- Reduced-motion mode: zero running animations (check `document.getAnimations().length === 0` after load, excluding view transitions).
