---
name: multilingual-content-workflow
description: Arabic/French/English content — UI dictionaries, database translations with fallback to the original, localized routes and metadata, translation review status, and translated academy content. Use when adding UI text, translatable database fields, new content types, or translation/editor tooling.
---

# Multilingual content workflow

**Pairs with:** `arabic-rtl-design-system` (presentation), `supabase-security-rls` (translations table policies).

## Two kinds of text
1. **Interface strings** → `src/i18n/dictionaries/{ar,fr,en}.ts`. `ar.ts` defines the shape (`Dictionary` type); `fr`/`en` must satisfy it, so a missing key is a type error.
   - Placeholders: `"{n} دروس"` + `fill(template, { n })`. Never concatenate fragments.
   - Arrays allowed for ordered lists (lesson stages).
2. **Content** (events, courses, lessons, maqamat, recordings…) → base row holds the original (Arabic by default; `articles.original_locale` allows others), translations in `public.translations (entity_type, entity_id, locale, field, value, is_reviewed)`.
   - Read: `getTranslations(type, ids, locale)` + `localize(rows, map)` in `src/lib/data/events.ts` (generalize to `src/lib/data/i18n.ts` when a third consumer appears). Missing translation → original text, never an empty string.
   - RLS: translations are visible exactly when the source row is (`can_read_entity`).

## Routes & metadata
- URLs: `/ar/...`, `/fr/...`, `/en/...` with identical path segments; `alternates.languages` set in the root layout; `<html lang dir>`.
- Locale choice: URL first, then `NEXT_LOCALE` cookie, then `Accept-Language`, then `ar` (`src/proxy.ts`).

## Adding a translatable field/content type
1. Add the entity type to the `translations.entity_type` check constraint and to `private.can_read_entity` / `private.can_translate` (migration).
2. Use `localize` in the page that renders it.
3. Admin/editor UI: side-by-side original + fr + en fields, `is_reviewed` toggle, "missing translations" filter.

## Translation quality
- Musical terms: keep Arabic terms transliterated consistently in fr/en (maqâm/maqam, jins/ajnâs, iqâʿ, nouba, malouf). Maintain a glossary in `docs/glossary.md` (create when the first editor UI is built).
- Machine translation may be used as a draft only; `is_reviewed = false` until a club member checks it. Whether visitors see unreviewed translations is a board decision (spec §12); until decided, show them (better than falling back) and list them in the editor's review queue.

## Acceptance criteria
- `npx tsc` catches any missing dictionary key.
- Every page renders in all three locales with no raw keys and no empty strings.
- Content without fr/en translations renders the Arabic original with `lang="ar"` on that element (add the attribute when falling back).
