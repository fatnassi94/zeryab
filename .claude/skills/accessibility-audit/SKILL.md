---
name: accessibility-audit
description: Accessibility review and fixes to WCAG 2.2 AA — semantic HTML, keyboard navigation, focus management, screen-reader labels in Arabic/French/English, colour contrast, reduced motion and accessible audio/quiz controls. Use before merging UI, when adding interactive widgets (players, quizzes, menus, forms), or when asked to audit or fix accessibility.
---

# Accessibility audit

**Applies to:** every UI skill. **Automated checks:** `@axe-core/playwright` (not yet a dependency — add as devDependency when the test suite is set up, see `production-quality-review`).

## Workflow
1. **Semantics first**: real `<button>`, `<a href>`, `<form>`, `<label htmlFor>`, `<nav aria-label>`, headings in order (one `h1` per page), lists for lists, `<table>` with `<th scope>` for tabular data.
2. **Names in the current language**: every icon-only control has an `aria-label` from the dictionary (e.g. `AudioButton` label = "تشغيل: <title>"). Never hard-code English labels.
3. **State**: toggles use `aria-pressed` (RSVP buttons, quiz options, play/pause); current page links `aria-current="page"`; async results announced via `role="status"`; errors via `role="alert"`.
4. **Keyboard**: everything reachable with Tab, operable with Enter/Space, visible `:focus-visible` ring (gold, defined in `@layer base`). Disclosure menus (`<details>`) close with a second activation; custom popovers must close on Escape and return focus.
5. **Contrast**: AA 4.5:1 body / 3:1 large text and UI boundaries. `faint` is placeholder-only. Check text over illustrations with the scrim on.
6. **Motion**: everything decorative stops under `prefers-reduced-motion` (CSS media query; Motion's `MotionConfig reducedMotion="user"`; GSAP `matchMedia`).
7. **Audio & learning**: players expose play/pause, position and duration as text; never autoplay sound; exercises are answerable without hearing colour (marks "الإجابة الصحيحة"/"اختيارك" are text, not colour only); provide transcripts/notation where audio carries instruction.
8. **Language**: `<html lang dir>` set per locale; inline foreign text gets `lang` (the language switcher links set `lang`/`hrefLang`).

## Automated pass (once Playwright is added)
```ts
import AxeBuilder from "@axe-core/playwright";
const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
expect(results.violations).toEqual([]);
```
Run on `/ar`, `/fr`, `/ar/login`, `/ar/events/<id>`, `/ar/members`, `/ar/admin`, a lesson page.

## Failure modes
- `div onClick` widgets; links styled as buttons that perform actions; placeholder used as label.
- Focus lost after server actions re-render (return focus to the triggering control or the status message).
- Gold text on gold, teal chips under 4.5:1 at small sizes.

## Acceptance criteria
- Zero axe violations on the routes above in `ar` and `en`.
- Full keyboard walkthrough of: login, booking, RSVP, quiz, admin approve/reject.
- VoiceOver (macOS/iOS) reads Arabic labels in Arabic.
