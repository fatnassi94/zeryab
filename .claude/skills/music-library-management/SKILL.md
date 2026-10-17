---
name: music-library-management
description: Secure upload and management of recordings and documents — validated uploads to Supabase Storage, metadata (performers, maqam, iqa', form, date, source, rights), categories, playlists, access levels, archival instead of deletion, peaks generation and signed delivery. Use when building upload forms, the library/archive UI, playlist editing, or content-ingestion scripts.
---

# Music library management

**Depends on:** `supabase-security-rls` (tables `recordings`, `documents`, `categories`, `playlists`, `playlist_items`; buckets), `multilingual-content-workflow`, `pro-audio-player-ui`.

## Upload workflow (staff: librarian/admin; teachers for their course)
1. Client picks file → validate type (audio/mpeg, audio/mp4, audio/ogg, audio/wav, audio/flac, audio/webm, application/pdf, images) and size (≤ 50 MB bucket limit) before upload.
2. Path convention: `media-private/recordings/<yyyy>/<uuid>.<ext>` (or `media-public/...` only for `visibility = public`). Never use the original filename in the path (store it in metadata).
3. Upload with the user's session (`supabase.storage.from(bucket).upload(path, file, { contentType, upsert: false })`) — storage RLS allows staff only. Large files: resumable (TUS) upload.
4. Insert the `recordings`/`documents` row with `storage_bucket`, `storage_path`, `mime_type`, `size_bytes`, `duration_seconds` (read from an `<audio>` element's metadata), `status = 'draft'`.
5. Generate waveform peaks (see `canvas-audio-visualization`) → `<path>.peaks.json` next to the file.
6. Metadata form (required before publishing): title, performers, maqam, iqa'/rhythm, form, recorded date, event link, **source and rights**, language, category, access level (+ ensemble/course when needed). Matches the spec's "content card".
7. Publish = `status = 'published'`. Remove = `status = 'archived'` (keeps history); hard delete only by admin, audited.

## Delivery
- Private files only through short-lived signed URLs (`mediaUrls()` in `src/lib/data/media.ts`), created with the viewer's session so storage RLS decides.
- Changing a recording's visibility from public → private must also move the file to `media-private` (public URLs are cacheable/shareable).

## Playlists & collections
- Ordered `playlist_items.position`; drag reorder writes positions in one batch; playlist visibility can't exceed the visibility of its items (warn when a members-only recording is in a public playlist — RLS will hide it anyway).

## Failure modes
- Orphan files (upload succeeded, row insert failed) → cleanup job or insert row first with `status='draft'` then upload.
- Rights unknown → keep `private`/draft; never publish.
- Original filenames with personal data in public URLs.

## Acceptance criteria
- A member can play a members-only recording; an anonymous visitor gets 400/403 from Storage for the same path.
- Upload → metadata → publish → archive flow works end-to-end with audit entries.
- Every published item has source and rights filled.
