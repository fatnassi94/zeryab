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

## Sheet music from a photo or PDF (Claude)

Admins can turn a photo or PDF of a song's sheet music into notation in the Maqam lab
(`/ar/academy/studio` → **أغنية من ملف نوتة**), listen to it, check it, and save it to the
club library for members. Off until a key is set.

**Turn it on**
1. Create an API key in the Claude Console (platform.claude.com → API keys) and set a monthly spend limit there.
2. Put it in `.env.local` (git-ignored): `ANTHROPIC_API_KEY=sk-ant-…`
3. Restart `npm run dev` (on a host such as Vercel, add the same variable in its settings).

**Use it**
1. Sign in as admin → Maqam lab → *Song from a score file* → *Read a photo or PDF with Claude*.
2. Choose up to 8 photos in page order, or one PDF → *Transcribe* (one to three minutes).
3. Compare with the original while it plays: Claude's notes and bars that don't add up are listed.
4. *Save to the club library* (members or everyone). To fix mistakes: *Download MusicXML*, correct it in MuseScore, add the file again.

**Without an API key (with a Claude subscription)** — put the photos or PDFs in `score-inbox/`
(git-ignored) and ask Claude Code to transcribe them. It reads the maqam printed on each score and writes
`score-inbox/<song>.json` (notes + title, composer, maqam, source, rights, original file);
`npm run score:convert -- score-inbox/<song>.json` checks it and creates `<song>.musicxml`.
Then, with `npm run dev` running and signed in as admin, the club library shows
**Import score-inbox (n)**: the songs arrive as drafts filed under their maqam, with the original PDF.
Open each one, listen, compare with the original (*Show the original score*), then **Publish**.
Running the import again updates the same songs.

**Reading mode** — the score full screen, larger, with a gold cursor that moves through the notes, the
sounding note's name shown large and the page following the music (Space plays/stops, Esc leaves).

**Cost** — `claude-opus-5-5` at high effort, about $0.20–0.60 per page; the lab shows the tokens and estimated cost after each run.
**Turn it off** — remove `ANTHROPIC_API_KEY` and restart. The panel disappears; saved songs stay.

**Reuse in another project** — copy `src/lib/ai/transcribe.ts` (Claude call, server-only),
`src/lib/music/score/{ai-transcription,musicxml-write,types,notate,spell}.ts` and `src/lib/music/notes.ts`,
install `@anthropic-ai/sdk`, set `ANTHROPIC_API_KEY`, then:
`scoreToMusicXml(transcriptionToScore((await transcribeSheetMusic(files)).transcription))` gives a
MusicXML file that MuseScore, Sibelius or Finale opens.

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
