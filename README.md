# نادي زرياب — Zeryab Club platform

Next.js 16 (App Router, TypeScript, Tailwind 4) + Supabase (Postgres, Auth, Storage).
Arabic is the default language; French and English live under `/fr` and `/en`.

## Run locally

```bash
cp .env.example .env.local   # already filled with the public URL and key
npm install
npm run dev                  # http://localhost:3000 → redirects to /ar
```

The first admin is the account that signs up with the club's bootstrap email
(see `supabase/migrations/20261017000009_bootstrap_admin.sql`).

## Structure

| Path | What |
|---|---|
| `src/app/[lang]/` | Public site, `login`, `join`, `events`, `academy`, `members`, `admin` |
| `src/app/auth/confirm` | Email-confirmation callback |
| `src/proxy.ts` | Locale redirect, Supabase session refresh, sign-in gate for `/members` and `/admin` |
| `src/lib/auth.ts` | `getViewer()` / `requireRole()` — server-side role checks |
| `src/i18n/` | Locales and the ar / fr / en dictionaries |
| `supabase/migrations/` | Full schema, RLS policies, storage buckets |

## Security model

Access is enforced in the database with Row Level Security, not by hiding links.
The browser only ever holds the publishable key. Never expose `SUPABASE_SECRET_KEY`
to client code.

Private audio and PDFs live in the `media-private` bucket and are served through
short-lived signed URLs that Storage only issues to viewers allowed by RLS.

## Content conventions

- Maqam `scale_notes`: one entry per degree, `"Arabic name|Western name"`, e.g. `"دوكاه|ري"`.
- Maqam `ajnas`: `[{ "name": "جنس بياتي على الدوكاه", "notes": 4 }, …]`.
- Translations: rows in `translations` (`entity_type`, `entity_id`, `locale`, `field`, `value`);
  missing translations fall back to the original text.
