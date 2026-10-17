---
name: creative-frontend-art-direction
description: Art direction for immersive, story-led pages — cinematic homepages, illustrated scenes, imagery and composition rooted in Arabic musical heritage (the ark, lanterns, instruments, manuscripts). Use when creating a hero, landing page, campaign or concert page, choosing imagery, or when a page needs a stronger narrative identity.
---

# Creative frontend art direction

Zeryab's visual story: **a lit ark carrying musical heritage through the flood** — night sea, rain, lantern-gold windows, a dove with an olive branch. New storytelling pages extend that world rather than inventing a new one.

**Builds on:** `premium-ui-design`. **Uses:** `motion-design-system`, `gsap-cinematic-web` (sequences), `web-animation-performance` (budgets).

## When to use
Heroes, concert/campaign landing pages, academy entry pages, about/history pages, posters rendered as pages.

## Workflow
1. **Write the scene in one line** (subject, light source, mood, motion): e.g. "The ark's windows glow brighter as the next concert approaches."
2. **Pick the motif from the music**, not from web trends: oud rosette geometry, qanun strings, nay breath, riq jingles, manuscript margins, maqam degrees as lantern lights.
3. **Compose for two directions**: the illustration sits opposite the reading-start side (mirror the scene wrapper with `ltr:-scale-x-100` rather than drawing twice). Add a directional scrim (`bg-gradient-to-l`/`ltr:bg-gradient-to-r`) so copy stays readable over art.
4. **Build illustrations as inline SVG components** (`src/components/hero-scene.tsx` is the reference): `aria-hidden`, gradients/filters in `<defs>`, animation via CSS classes that are disabled under `prefers-reduced-motion`.
5. **Imagery**: real photos of the club (rehearsals, instruments, concerts) beat stock. Store in Supabase Storage `media-public`, serve via `next/image` with explicit sizes. Credit photographers in metadata.
6. **Motion budget per scene**: one ambient loop (rain, water), one focal loop (ark bob, lantern glow), one entrance sequence. Nothing else moves.

## Constraints
- No AI-looking gradient blobs, generic 3D shapes or stock "music notes" clip art.
- Never place essential text inside the SVG (not translatable, not accessible).
- The scene must still read as a still image (reduced motion, low-power mode, screenshots).
- Keep hero LCP fast: the SVG is inline and small; large photos get `priority` only if they are the LCP element.

## Acceptance criteria
- The page's story can be described in one sentence and matches the brand world.
- Text contrast over art ≥ 4.5:1 in all locales and widths.
- Reduced-motion screenshot looks intentional, not broken.
- Lighthouse performance ≥ 90 on mobile for the page.

## Example decisions
- Concert page hero: reuse the night sea; the dated "ticket" card floats where the ark's lantern light falls.
- Academy hero: a maqam's eight degrees rendered as lanterns along the ark's rail, tonic and ghammaz lit gold/teal — the same colour logic as the lesson scale diagram.
