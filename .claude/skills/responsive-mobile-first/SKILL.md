---
name: responsive-mobile-first
description: Mobile-first responsive layouts for phones, tablets and desktop — fluid grids, touch targets, adaptive navigation, safe flex/grid sizing and real-device verification. Use when building any layout, when something overflows or overlaps on small screens, or when designing navigation and controls for touch.
---

# Responsive, mobile-first

Most club members will use phones (and the installed PWA). Design at 390 px first, then expand.

**Builds on:** `design-system-architecture`, `arabic-rtl-design-system`. **Verified by:** `production-quality-review`.

## Workflow
1. **Start at 390 × 844** (also check 360 px). Single column, full-width primary actions where helpful.
2. **Size flex/grid children safely**: `flex-[1_1_min(320px,100%)]` and `grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]`. A bare `flex-[1_1_520px]` overflows a phone. Add `min-w-0` to flex children containing long text; truncate single-line titles.
3. **Keep content in flow.** Avoid `absolute` positioning for anything with text (the old hero's absolute "next concert" card covered the CTAs on phones). Use `flex-col justify-between` + `min-h-[min(100svh,960px)]` for full-height heroes.
4. **Navigation**: desktop inline nav at `lg`; below that one compact row (logo · language · menu) with a `<details>` disclosure panel (`SiteHeader`). Sidebars (members/admin) stack above content on phones.
5. **Touch**: targets ≥ 44 × 44 px, 8 px apart; no hover-only affordances; inputs ≥ 16 px font (prevents iOS zoom) — `.field` uses 15 px, raise to 16 px if zoom is observed.
6. **Tables** scroll inside their own `overflow-x-auto` box with a `min-w`.
7. **Use `svh/dvh`** for viewport heights on mobile, not `vh`.

## Verification (headless browsers lie)
Headless Chrome/Brave windows can't go below ~500 px wide, so `--window-size=390,…` screenshots are clipped, not real. Use Playwright with a viewport and `isMobile: true` and assert `document.documentElement.scrollWidth === innerWidth`. Script: see `production-quality-review`.

## Failure modes
- Fixed heights on sections with variable text (French expands).
- `100vh` heroes jumping when the mobile URL bar collapses.
- Horizontally scrolling page caused by one wide child.

## Acceptance criteria
- `scrollWidth === innerWidth` at 360, 390, 768, 1280, 1440 for every route in all locales.
- Primary action visible without scrolling on a 390 × 844 home screen.
- No text overlaps illustrations or other text at any width.
