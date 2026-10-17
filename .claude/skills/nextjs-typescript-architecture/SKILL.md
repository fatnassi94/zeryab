---
name: nextjs-typescript-architecture
description: Conventions for this Next.js 16 (App Router, Turbopack, React 19) + strict TypeScript codebase — [lang] root layouts, proxy.ts, server/client boundaries, Server Actions, data access layer, typed Supabase, folder structure. Use when adding routes, actions, components or libraries, or when unsure where code belongs or which Next.js API applies.
---

# Next.js + TypeScript architecture

**Read first:** `AGENTS.md` — this Next.js version differs from older training data. Check `node_modules/next/dist/docs/` before using an API you aren't sure about.

## Project facts
- Next 16.4, React 19.3, Tailwind 4, TypeScript strict. `cacheComponents` is **off** (decided: simpler auth reads; revisit later with `authentication-with-cache-components` doc).
- **Middleware is `src/proxy.ts`** (Next 16 rename): locale redirect, Supabase session refresh (`updateSession`), optimistic redirect to login for `/members` and `/admin`. Not an authorization layer.
- **Root layout per locale**: `src/app/[lang]/layout.tsx` (`generateStaticParams` → ar/fr/en). Switching locale = full document navigation. `next/root-params` (`lang()`) is available in Server Components (used in `not-found.tsx`).
- Route-aware types `PageProps<"/[lang]/...">` / `LayoutProps<...>` are global; run `npx next typegen` after adding routes.
- Non-locale routes: `src/app/auth/confirm/route.ts`, `manifest.ts`, `apple-icon.tsx`.

## Structure
```
src/app/[lang]/<route>/page.tsx      Server Component pages
src/app/[lang]/<route>/actions.ts    "use server" actions for that route
src/app/[lang]/<route>/*.tsx         Route-local client components ("use client")
src/components/                      Shared UI (server by default)
src/lib/auth.ts                      getViewer() (React cache), requireViewer/requireRole
src/lib/supabase/{server,proxy}.ts   Clients (publishable key; RLS applies)
src/lib/data/*.ts                    Data access helpers ("server-only")
src/lib/database.types.ts            Generated Supabase types — regenerate after migrations
src/i18n/                            config, server helpers, dictionaries
src/lib/music|audio/ (planned)       Pure engines (no React) — see audio skills
```

## Rules
1. Server Components by default; `"use client"` only at leaves needing state/effects/events.
2. **Every Server Action re-authorizes** (`getViewer()`), validates input, and relies on RLS as the final gate. Never trust hidden inputs for permissions.
3. Data access goes through `src/lib/data/*` or page-level queries using the user's Supabase client — never a service-role key in request paths. `SUPABASE_SECRET_KEY` is reserved for admin scripts/cron, server-only.
4. Redirect targets from user input pass an open-redirect guard (`startsWith("/") && !startsWith("//")`).
5. Use `useActionState` for forms with feedback; `useOptimistic` for instant toggles (RSVP).
6. Types: no `any`; narrow Supabase JSON columns at the boundary; prefer discriminated unions for state.
7. After DB migrations: regenerate types (Supabase MCP `generate_typescript_types` → `src/lib/database.types.ts`), then `npx tsc --noEmit`.

## Gotchas seen in this repo
- Dev server sometimes keeps stale CSS → restart `npm run dev` after big `globals.css` changes.
- Anonymous inserts (bookings, membership requests) must not `.select()` the inserted row — RLS forbids reading it back.
- `useSearchParams` in shared client components forces Suspense boundaries; read `window.location` in event handlers instead when possible.

## Acceptance criteria
`npx tsc --noEmit`, `npx eslint src`, `npm run build` all pass; new routes appear in the build output with the expected static/dynamic marker.
