---
name: performance-optimization
description: Core Web Vitals and runtime performance for the Next.js + Supabase app — LCP/INP/CLS budgets, code splitting and lazy loading of audio/3D/animation libraries, fonts, images, caching, efficient Supabase queries and indexes, PWA asset caching. Use when pages feel slow, before adding heavy dependencies, or when preparing a release.
---

# Performance optimization

**Related:** `web-animation-performance` (motion), `nextjs-typescript-architecture`, `supabase-security-rls` (indexes/advisors).

## Budgets (mobile, 4G, mid-range Android)
- LCP < 2.5 s, INP < 200 ms, CLS < 0.05; Lighthouse performance ≥ 90 on `/ar`, `/ar/events`, a lesson page.
- First-load JS for public pages: keep under ~150 KB gz beyond Next/React baseline.

## Workflow
1. **Measure first**: `npm run build` route table, Lighthouse (mobile), Chrome Performance panel; Supabase `query_logs` / advisors for slow queries.
2. **Heavy libraries are lazy**: Tone.js, smplr, wavesurfer, GSAP, Motion, three.js load only on pages/interactions that need them (`next/dynamic`, dynamic `import()` on first play/open). Never import them from shared layout components.
3. **Fonts**: `next/font` with explicit weights (current: Reem Kufi 500–700, Readex Pro 300–600, arabic+latin subsets). Don't add weights casually — each costs ~20–60 KB.
4. **Images**: `next/image` with `sizes`; Supabase host already allowed in `next.config.ts`. Hero art stays inline SVG.
5. **Data**: select only needed columns; batch translations per page (`getTranslations` with `in()`); parallelize independent queries (`Promise.all`); avoid N+1 (signed URLs via `createSignedUrls` batch). RLS helper calls wrapped in `(select …)` where possible. Add indexes for new filter/sort columns.
6. **Caching**: public, non-personal data (published events list, maqamat) can be cached with revalidation once Cache Components or `unstable_cache` is adopted — never cache anything read with a user session in a shared cache.
7. **Audio**: stream via `<audio>` for listening; decode into AudioBuffers only for editing/analysis; precomputed peaks for waveforms.
8. **PWA**: cache static assets and selected lesson media for offline use with explicit user action ("make available offline"); respect storage quotas.

## Failure modes
- Importing an audio/animation library in a Server Component tree that's shared by all pages.
- Unbounded queries (`select *` on recordings) in lists.
- Signed URL generation per item in a loop.

## Acceptance criteria
- Lighthouse mobile ≥ 90 on the budget pages in `ar` and `fr`.
- Supabase performance advisors: no unindexed foreign keys on tables with data; no slow queries > 200 ms in logs for common pages.
