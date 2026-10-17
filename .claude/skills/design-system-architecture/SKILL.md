---
name: design-system-architecture
description: Zeryab's design tokens and UI primitives — Tailwind v4 @theme tokens, CSS layer order, typography and spacing scales, buttons, cards, chips, fields and shared components. Use when adding colors, fonts, spacing, a new reusable component, or when styles conflict or a component looks inconsistent with the rest of the app.
---

# Design system architecture

Single source of truth: `src/app/globals.css` (tokens + primitives) and `src/components/*` (shared React components). Current token values: [references/tokens.md](references/tokens.md).

**Used by:** every UI skill. **Related:** `arabic-rtl-design-system`, `motion-design-system`.

## When to use
- Adding/changing a colour, font, radius, shadow or spacing value.
- Creating a component that will appear on more than one page.
- Any "this button/link looks wrong" or specificity bug.

## Layer order (critical)
Tailwind v4 emits native cascade layers: `theme, base, components, utilities`. **Unlayered CSS beats every layer.**
- Element defaults (`a`, `body`, `:focus-visible`, `::placeholder`) → `@layer base`.
- Reusable classes (`.card`, `.btn-gold`, `.btn-ghost`, `.chip`, `.field`, `.label`) → `@layer components`.
- One-off adjustments → utilities in markup (override components; use `!` suffix sparingly, e.g. `min-h-11!`).
- Unlayered rules only for things outside Tailwind's model: keyframes, `@view-transition`, `::view-transition-*`.
A past bug: `a { color: gold }` left unlayered made every `<Link className="btn-gold">` gold-on-gold (invisible text).

## Workflow for a new token or primitive
1. Check `references/tokens.md` — reuse before adding.
2. Add tokens to `@theme` (they become utilities: `--color-x` → `bg-x`, `text-x`).
3. Add primitives to `@layer components`; keep them direction-agnostic (logical props).
4. Promote to a React component when it has behaviour or ≥ 3 call sites (e.g. `AudioButton`, `MetaLine`, `PageShell`, `LanguageSwitcher`).
5. Server Components by default; add `"use client"` only for state/effects/events.
6. Update `references/tokens.md` in the same change.

## Primitives (current)
| Class / component | Use |
|---|---|
| `.btn-gold` | The single primary action per view |
| `.btn-ghost` | Secondary actions, sign-out, pagination |
| `.card` | Grouped content on `bg-ink` |
| `.chip`, `.chip-teal` | Status/metadata (gold = role/level, teal = access/kind) |
| `.field`, `.label` | Inputs; always paired with `<label htmlFor>` |
| `PageShell` | Header + main + footer for public pages |
| `MetaLine` | Bidi-safe "a · b · c" lines |
| `AudioButton` | Single-track play/pause (one track plays at a time) |

## Failure modes
- Hard-coded hex values in components instead of tokens.
- New component duplicating `.card` with slightly different radius/border.
- Fixed `flex-basis`/`minmax` wider than a phone — always `min(Npx,100%)`.

## Acceptance criteria
- `grep -rn "#[0-9A-Fa-f]\{6\}" src/app src/components` finds only SVG artwork and `globals.css`.
- New primitives render correctly in RTL and LTR and pass contrast.
