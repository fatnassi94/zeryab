-- Club song library for the Maqam lab: songs are `documents` rows of kind
-- 'score' whose file is uncompressed MusicXML. Access stays exactly as for
-- other documents (visibility + status via private.can_view, staff upload,
-- private files through signed URLs); the buckets only need to accept the type.

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/vnd.recordare.musicxml+xml')
where id in ('media-private', 'media-public')
  and not ('application/vnd.recordare.musicxml+xml' = any (allowed_mime_types));
