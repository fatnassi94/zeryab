---
name: premium-ui-design
description: Art-directed, premium interface design for the Zeryab platform — visual hierarchy, editorial layouts, restraint, and a "digital conservatory" feel. Use when designing or restyling any page, section, card, form or dashboard, or when a screen looks generic, cluttered, or like a stock SaaS template.
---

# Premium UI design

The platform should feel like a concert hall programme crossed with a finely made instrument: dark, warm, quiet, precise. Every screen earns its ornament.

**Builds on:** `design-system-architecture` (tokens, primitives), `arabic-rtl-design-system` (direction, type). **Hands off to:** `motion-design-system` for movement, `accessibility-audit` before shipping.

## When to use
- New page or section, or a redesign of an existing one.
- A screen reviewers call "plain", "generic", "busy" or "template-like".
- Choosing layout, hierarchy, imagery or emphasis for content.

## Workflow
1. **State the one job of the screen** in a sentence (e.g. "a member confirms tonight's rehearsal"). Everything else is secondary.
2. **Set hierarchy before style**: one display-size headline (Reem Kufi), one primary action (`.btn-gold`), at most one secondary (`.btn-ghost`). Count gold elements on screen — more than ~3 means gold has stopped meaning "act here".
3. **Compose on an editorial grid**: `max-w-[1280px]` container, generous vertical rhythm (56–112 px between sections), asymmetric splits (text column ≈ 600 px beside imagery) rather than centred stacks.
4. **Use surfaces deliberately**: `bg-ink` page → `.card` (`bg-panel`) for grouped content → `bg-white/4` for nested rows. Never more than three surface levels.
5. **Write real copy** in all three languages through `src/i18n/dictionaries/*`. Missing facts are visible placeholders like `[العنوان]`, never invented numbers.
6. **Check it at 390 px and 1440 px**, in `ar` and `fr` (longest strings), before calling it done.

## Principles specific to Zeryab
- Palette: deep night surfaces, lantern gold (`--color-gold #E4BE74`) for action and emphasis, sea-glass teal (`--color-teal`) for status/metadata chips, warm off-white text. Ivory may be introduced for long-form reading surfaces; keep gold restrained.
- Typography carries the identity: Reem Kufi for display, Readex Pro for body. Large Arabic display sizes (clamp 42–80 px) with line-height ≥ 1.15; Latin display smaller (clamp 36–64 px) because it runs longer.
- Ornament comes from music: waveforms that reflect real audio, maqam scale diagrams, rhythm cycles. Decorative patterns must never imitate functionality (a fake waveform must not look playable).
- Empty states are designed, not apologetic: one line of guidance + the next action.

## Anti-patterns (reject in review)
- Gradient-wash heroes, glassmorphism everywhere, emoji icons, Inter/Roboto, "dashboard cards with big numbers" used as decoration.
- Left-border accent cards, rainbow chips, more than two accent hues on one screen.
- Centred-everything layouts on desktop; walls of equal-weight cards.
- Gold text on gold (check CSS layer order: element styles live in `@layer base`, see `design-system-architecture`).

## Acceptance criteria
- A first-time viewer can name the screen's purpose and primary action within 3 seconds.
- No horizontal scroll at 390 px; no overlaps at 1440 px in any locale.
- All text meets WCAG AA contrast (4.5:1 body, 3:1 for ≥ 24 px).
- Screenshots of `ar`, `fr`, `en` at both widths reviewed (see `production-quality-review` for the screenshot script).

## Example decisions
- Home hero: copy column on the reading-start side, the ark illustration opposite (mirrored with `ltr:-scale-x-100`), next concert as an in-flow card below the CTAs — not absolutely positioned, so nothing collides when text grows.
- Members dashboard: the next rehearsal with RSVP buttons is the single highlighted surface (gold border, radial glow); everything else uses plain `.card`.
