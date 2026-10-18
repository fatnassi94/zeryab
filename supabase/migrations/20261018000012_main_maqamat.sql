-- The main maqamat as entries songs and lessons can point to (documents.maqam_id,
-- lessons.maqam_id). Names only: scale notes, ajnas and sayr stay empty for the
-- club's teachers to fill in; the lab's theoretical data is a reviewed-later draft.
insert into public.maqamat (slug, name, family, status, position) values
  ('rast', 'راست', 'راست', 'published', 1),
  ('bayati', 'بياتي', 'بياتي', 'published', 2),
  ('hijaz', 'حجاز', 'حجاز', 'published', 3),
  ('nahawand', 'نهاوند', 'نهاوند', 'published', 4),
  ('saba', 'صبا', 'صبا', 'published', 5),
  ('kurd', 'كرد', 'كرد', 'published', 6),
  ('ajam', 'عجم', 'عجم', 'published', 7),
  ('sikah', 'سيكاه', 'سيكاه', 'published', 8)
on conflict (slug) do nothing;
