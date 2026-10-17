---
name: motion-design-system
description: Global motion language for Zeryab — durations, easing, entrance/exit patterns, staggers, hover/press/focus states, page and language transitions, and reduced-motion rules. Use before adding any animation, when choosing between CSS, Motion (Framer Motion) and GSAP, or when animations feel inconsistent, slow or excessive.
---

# Motion design system

Motion should feel like a well-damped string: quick attack, soft decay, no wobble. Animate to explain (what changed, where it went), rarely to decorate.

**Implementations:** CSS (default), `framer-motion-specialist` (React state/layout), `gsap-cinematic-web` (timelines/scroll stories). **Guarded by:** `web-animation-performance`, `accessibility-audit`.

## Tokens
| Name | Duration | Easing | Use |
|---|---|---|---|
| `instant` | 120 ms | out | Press feedback, toggles |
| `fast` | 180 ms | out | Hover, colour, chips, menu open |
| `base` | 320 ms | out | Content entrance, cards, tabs |
| `slow` | 600 ms | in-out | Hero/scene entrances (once per page) |
| ambient | 3–14 s loops | in-out/linear | Rain, water, lantern glow only |
- `out` = `cubic-bezier(0.22, 1, 0.36, 1)`; `in` = `cubic-bezier(0.4, 0, 1, 1)`; `in-out` = `cubic-bezier(0.65, 0, 0.35, 1)`.
- Stagger 40–60 ms, max 6 items (beyond that, animate the group).
- Distance: entrances move 6–16 px, never more than 24 px. Exits are faster than entrances (≈ 60%).

## Choosing the tool
1. **CSS** for hover/focus/press, ambient loops, view transitions (language switch already uses cross-document `@view-transition` + `.lang-pill` morph in `globals.css`).
2. **Motion** (`motion/react`) when animation depends on React state: presence (mount/unmount), layout changes, shared elements, gestures, drag in editors.
3. **GSAP** for multi-step timelines, scroll-scrubbed storytelling, SVG morph/draw, audio-synced sequences.
Never animate the same property of the same element with two systems.

## Rules
- Only `transform` and `opacity` (and `filter` sparingly) in loops; see `web-animation-performance`.
- Interactive states: hover = colour/border shift (`fast`); press = `scale(0.98)` (`instant`); focus = ring, no animation needed.
- Musical sync: when motion represents audio (playhead, beat pulse), drive it from the audio clock (`AudioContext.currentTime` / Tone.Transport), not `setTimeout`.
- **Reduced motion**: loops stop; entrances become instant opacity; scroll-scrubbed scenes become static frames. Implement in all three systems (CSS media query, `MotionConfig reducedMotion="user"`, `gsap.matchMedia()`).

## Acceptance criteria
- Each animation maps to a token; no ad-hoc durations in code review.
- With reduced motion enabled, the page is fully usable and nothing loops.
- No animation delays the user's first possible interaction by more than 300 ms.

## Example decisions
- RSVP button: colour/border change at `fast`, optimistic state via `useOptimistic`; no bounce.
- Quiz answer reveal: correct option border fades in at `base`; explanation slides 8 px with opacity.
- Language switch: old page fades out 180 ms, new page fades/rises in 320 ms; pill morphs 380 ms.
