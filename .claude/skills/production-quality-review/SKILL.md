---
name: production-quality-review
description: Release-readiness review — functional walkthroughs per role, security and RLS checks, accessibility, responsive screenshots in three locales, error/empty/loading states, regression tests and build health. Use before merging significant work, before a pilot launch, or when asked to "review", "QA" or "check everything".
---

# Production quality review

Combines: `accessibility-audit`, `responsive-mobile-first`, `supabase-security-rls`, `performance-optimization`, `audio-engine-testing`. The project spec (§9) makes security, private files and backups **acceptance conditions, not optional features**.

## Checklist
1. **Build health**: `npx tsc --noEmit`, `npx eslint src`, `npm run build` — zero errors.
2. **Role walkthroughs** (use test accounts, never real member data): visitor, pending account, member, teacher, librarian, activity manager, admin. For each: what they can see, do, and must be refused (try direct URLs and direct Supabase calls).
3. **Security**: Supabase advisors (security) clean; secrets only server-side (`grep -rn "SECRET\|service_role" src`); private storage paths return 400/403 anonymously; open-redirect guards on `next` params; Server Actions re-check roles.
4. **Visual QA**: screenshots of every changed route in `ar`, `fr`, `en` at 390×844 (Playwright `isMobile`) and 1440×900; assert no horizontal overflow. Script: [references/visual-check.md](references/visual-check.md).
5. **States**: loading, empty, error (network down, expired signed URL, RLS refusal), success — each designed and translated.
6. **Accessibility**: axe on key routes; keyboard walkthrough of forms, menus, player, quiz.
7. **Performance**: Lighthouse mobile on budget pages.
8. **Data & operations**: migrations in repo match remote; backup/restore plan documented (Supabase PITR or scheduled dumps); auth URL configuration (Site URL, redirect URLs) set for the production domain; email sender configured (default Supabase SMTP is rate-limited — use custom SMTP before launch).
9. **Content**: no placeholder like `[العنوان]` left on public pages at launch; rights filled on published media.

## Reporting
Group findings by severity (blocker / should-fix / polish) with file:line, reproduction steps and the role/locale/width where it happens. Re-run the checklist items affected by fixes.

## Acceptance criteria
- No blockers; every should-fix has an owner or is fixed.
- Screenshot set archived for the release.
