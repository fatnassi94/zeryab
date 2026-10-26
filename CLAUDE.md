@AGENTS.md

# Zeryab club platform: rules for agents

Next.js 16 (App Router, React 19, Tailwind 4) + Supabase (project `dwmboexuyjdahprjavxo`). Arabic first (RTL); French and English under `/fr`, `/en`.

## How the owner wants work done
- One phase at a time. Finish it, verify it, summarise it in a few short points.
- **Ask before committing or pushing to `main`.** Approval for one piece of work does not carry over to the next.
- **Never delete git branches.**
- Database changes: write a migration in `supabase/migrations/` and ask the owner to apply it; never change the live database without approval. Test policies in a transaction that is rolled back.
- Replies to the owner: short and plain, no jargon.

## Verify before saying "done"
`npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build` · `npm run check:visual` (needs `npx next start -p 3005`). Audio changes: also `npm run check:audio`. Run `npx next typegen` after adding a route.

## Security rules
- Secrets stay in `.env.local` (git-ignored). Never prefix a secret with `NEXT_PUBLIC_`, never commit it, never use the Supabase secret key from code.
- Every Server Action checks the viewer (`getViewer`/`requireRole` in `src/lib/auth.ts`) and validates its input; RLS enforces the same rules in the database.
- Members-only data stays behind RLS (`private.is_active_member()`); new tables get RLS and policies in the same migration.
- Never commit `score-inbox/` (third-party sheet music).

## Where things live
- Texts: `src/i18n/dictionaries/{ar,fr,en}.ts`, all three updated together (`fr`/`en` are typed from `ar`).
- Sign-up rules: `src/lib/signup.ts` (tested). Member parts: lead_vocal, percussion, instrument.
- Members back office: `src/app/[lang]/admin/members`; posts (rehearsals) and attendance: `src/app/[lang]/admin/posts`.
- Show programs: `src/lib/programs.ts` + `public/programs/<slug>/`, pages under `src/app/[lang]/library/programs`.
- Maqam lab: `src/app/[lang]/academy/studio`; music engine: `src/lib/music`, audio: `src/lib/audio`.
- Project skills (conventions per area): `.claude/skills/`.

## Known pitfalls
- Server and browser trigonometry differ in the last digits: round SVG coordinates or hydration fails.
- A `"use server"` file may export only async functions (put constants in `src/lib`).
- React lint forbids `Date.now()` and synchronous `setState` in render/effects: use helpers (`src/lib/posts.ts`) or callbacks.
