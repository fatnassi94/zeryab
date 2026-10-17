---
name: framer-motion-specialist
description: React UI animation with Motion (formerly Framer Motion, package "motion", import from "motion/react") in the Next.js App Router — AnimatePresence, layout and shared-element transitions, gestures, scroll-linked values, reduced motion. Use when animating component mount/unmount, list reordering, tabs, drawers, drag interactions in the arrangement editor, or scroll-triggered UI.
---

# Motion (Framer Motion) specialist

**Package:** `motion` (not installed yet; `npm i motion` when first needed). Import from `motion/react` in Client Components; `motion/react-client` exposes `motion.*` elements usable from Server Components without making the whole file a client module.
**Follows:** `motion-design-system` tokens. **Perf:** `web-animation-performance`.

## When to use
Presence animations (menus, dialogs, toasts, quiz feedback), layout animations (filtering the library, reordering playlist items), shared elements (recording card → full player), gestures (drag clips on the arrangement timeline), `useScroll`/`useTransform` for light scroll effects.

## Workflow
1. Keep the page a Server Component; isolate animated parts into small `"use client"` components.
2. Wrap the app's client islands with one `MotionConfig` providing `reducedMotion="user"` and the default transition (`{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }`).
3. Presence: `<AnimatePresence mode="popLayout" initial={false}>`; every child needs a stable `key`.
4. Layout: add `layout` (or `layout="position"` for text-heavy items to avoid scaling text); use `LayoutGroup` for siblings that affect each other.
5. Shared elements: same `layoutId` on both ends; keep them in the same React tree (not across root layouts — language switch uses CSS view transitions instead).
6. Gestures: `drag="x"` with `dragConstraints` and `dragMomentum={false}` for timeline editing; snap to the musical grid in `onDragEnd` (convert px → beats via the engine, don't store pixels).
7. RTL: horizontal offsets must flip — read `document.dir` (or pass `dir` prop) and multiply x by −1 for RTL.

## Failure modes
- Importing `motion` in a Server Component file → build error; use `motion/react-client` or a client wrapper.
- Animating `height: auto` on large lists → jank; prefer `layout` or grid-template-rows trick.
- Hydration mismatch from `initial` values differing between server and client; use `initial={false}` for above-the-fold content.
- Drag on timelines writing to React state at 60 fps → re-render storms; use `useMotionValue` and commit on drag end.

## Acceptance criteria
- Animations respect `MotionConfig reducedMotion="user"` (verify with macOS "Reduce motion").
- No layout shift (CLS) introduced on page load.
- RTL and LTR directions both feel natural (menus slide from the reading-start side).

## Example
```tsx
"use client";
import { AnimatePresence, motion } from "motion/react";
export function Feedback({ text }: { text: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {text && (
        <motion.p key={text} role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
```
