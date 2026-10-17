---
name: webgl-threejs-experiences
description: Optional 3D and WebGL experiences with three.js / React Three Fiber — instrument models (oud, qanun, riq), immersive concert-hall or ark scenes, audio-reactive visuals — with strict performance budgets and fallbacks. Use only when a 3D scene provides a measurable benefit over SVG/Canvas, and for any three.js, R3F or shader work.
---

# WebGL / three.js experiences

3D is optional at Zeryab. Default answer: SVG or Canvas 2D. Use WebGL only when depth, lighting or thousands of moving elements are essential (e.g. an explorable oud showing how string courses map to maqam degrees).

**Packages (when justified):** `three`, `@react-three/fiber` (v9, React 19), `@react-three/drei`. Not installed.
**Depends on:** `web-animation-performance`. **Often paired with:** `canvas-audio-visualization`.

## Decision gate (answer before building)
1. What can the user learn/do in 3D that they can't in 2D? Write it down.
2. Mobile budget: ≤ 150 KB JS added (lazy-loaded), ≤ 2 MB assets (Draco/meshopt-compressed glTF, KTX2 textures), 60 fps on mid-range phones.
3. Fallback: a static image or SVG rendered first; 3D loads on interaction or when idle and visible.
If any answer is weak, build it in SVG.

## Workflow
1. Load the canvas with `next/dynamic(() => import(...), { ssr: false })` inside a client component, only when in viewport (IntersectionObserver).
2. `<Canvas dpr={[1, 1.75]} frameloop="demand">` unless continuously animating; call `invalidate()` on changes.
3. Models: glTF via `useGLTF` (drei), compressed; verify model licences (CC-BY needs credit in the page).
4. Audio-reactive: read `AnalyserNode` data once per frame into a preallocated `Uint8Array`; pass via refs, never React state.
5. Respect reduced motion: stop auto-rotation and particle drift; keep manual orbit.
6. Dispose geometries/materials/textures on unmount (R3F handles scene graph objects it created; manual resources need cleanup).
7. Provide keyboard alternatives (buttons for "next string", "rotate") and a text description.

## Failure modes
- Shipping three.js in the main bundle; SSR errors from `window` access.
- Uncompressed 20 MB models; unbounded `dpr` on retina phones.
- Continuous render loop on a static scene draining battery.

## Acceptance criteria
- Lighthouse mobile performance stays ≥ 90 on the page (3D deferred).
- Scene degrades to the fallback when WebGL is unavailable.
- Memory stable after mounting/unmounting the scene 10 times.
