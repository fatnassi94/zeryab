---
name: arabic-rtl-design-system
description: Arabic-first, right-to-left layout and multilingual typography for Arabic, French and English — logical CSS properties, bidirectional text, mirrored icons, locale-aware numbers and dates. Use whenever building or reviewing UI that must work in ar (RTL) and fr/en (LTR), or when text order, alignment or icons look wrong in one direction.
---

# Arabic RTL design system

Arabic is the default locale (`/ar`, `dir="rtl"`); French and English are LTR. Design in Arabic first, then verify LTR — never the reverse.

**Builds on:** `design-system-architecture`. **Pairs with:** `multilingual-content-workflow` (content and fallbacks).

## When to use
- Any new component or page; any bug like "arrow points the wrong way", "numbers jumble", "padding is on the wrong side", "layout jumps when switching language".

## Workflow
1. **Use logical properties only**: Tailwind `ps-/pe-`, `ms-/me-`, `start-/end-`, `border-s/e`, `text-start/end`, `rounded-s/e`. Grep before merging: `grep -rnE "\b(pl|pr|ml|mr|left|right)-" src` should find nothing new in layout code.
2. **Direction comes from `<html dir>`** set in `src/app/[lang]/layout.tsx` via `dirOf(locale)`. Components never hard-code `dir` except for inherently LTR content: emails, phone numbers, URLs, code (`dir="ltr"` on those inputs).
3. **Isolate mixed-direction runs**: user content or data that may be in another script goes in `<bdi>`. Use `MetaLine` (`src/components/meta-line.tsx`) for "venue · time" style lines, and `contentLang()` for untranslated database fields on fr/en pages.
4. **Mirror only directional icons**: arrows, chevrons, play triangles use `ltr:-scale-x-100` (they are drawn for RTL). Never mirror logos, clocks, musical notation, checkmarks, media timelines (a waveform plays left→right in LTR players; for RTL audio UI keep progress filling in reading direction and test).
5. **Format numbers/dates with Intl** through `formatDate/formatTime/formatNumber` in `src/i18n/server.ts` (time zone `Africa/Tunis`). `ar-TN` uses Latin digits; do not force Arabic-Indic digits unless the club decides so globally.
6. **Typography per script**: Arabic needs larger line-height (1.8–1.9 body, ≥1.15 display) and no letter-spacing; Latin display can take slight negative tracking. Size Latin display smaller — French strings run ~30–60% longer than Arabic.
7. **Switching language** is a full document navigation (one root layout per locale). Keep it smooth: cross-document `@view-transition`, morphing `.lang-pill`, scroll restored by `ScrollRestore`. Don't convert it to client-side navigation; root layouts differ.

## Failure modes
- `text-left`/`pl-4` sneaking in from copied snippets → broken RTL.
- Concatenating translated fragments ("Seats left: " + n) instead of templates with placeholders (`fill(dict.events.seatsLeft, { n })`) → wrong word order.
- Latin brand names inside Arabic sentences without isolation → punctuation jumps to the wrong end.
- Icons with baked-in direction rendered without the `ltr:` mirror.

## Acceptance criteria
- Each changed screen screenshotted in `ar` and `fr` at 390 and 1440 px; layouts are mirror images where intended, and nothing overlaps.
- Mixed Arabic/Latin lines read correctly (check venue + time, names + emails).
- Keyboard focus order follows visual order in both directions.

## Example
Hero CTA arrow: `<ForwardArrow />` is drawn pointing left (forward in Arabic) and carries `ltr:-scale-x-100`, so "→" in French/English with no extra code.
