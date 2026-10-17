# Starter maqam data — THEORETICAL, status: draft, needs review

These values are the common **24-tone (quarter-tone) theoretical approximations** used in many Arabic theory texts. They are a starting point only: real intonation differs by tradition, region, performer and instrument (e.g. sikah and awj are often played noticeably lower or higher than the 150/350-cent grid; Tunisian practice has its own tbu' system). Every entry must be reviewed by the club's teachers before it is marked `reviewed`.

Cents are measured from the maqam's tonic. "½♭" = half-flat (quarter-tone flat).

## Ajnas (lower tetrachords/trichords), intervals in cents
| Jins | Steps | Degrees from its root |
|---|---|---|
| Rast | 200, 150, 150 | 0, 200, 350, 500 |
| Bayati | 150, 150, 200 | 0, 150, 300, 500 |
| Hijaz | 100, 300, 100 | 0, 100, 400, 500 |
| Nahawand | 200, 100, 200 | 0, 200, 300, 500 |
| Kurd | 100, 200, 200 | 0, 100, 300, 500 |
| Ajam | 200, 200, 100 | 0, 200, 400, 500 |
| Saba | 150, 150, 100 | 0, 150, 300, 400 (trichord + diminished fourth) |
| Sikah | 150, 200 | 0, 150, 350 (trichord) |

## Maqamat (ascending, one octave)
| Maqam | Tonic (Arabic / Western) | Degrees (cents) | Lower jins | Common upper jins | Ghammaz |
|---|---|---|---|---|---|
| Rast | Rast / C | 0, 200, 350, 500, 700, 900, 1050, 1200 | Rast on C | Rast on G (desc. often Nahawand on G: B♭) | G (deg 4) |
| Bayati | Dukah / D | 0, 150, 300, 500, 700, 800, 1000, 1200 | Bayati on D | Nahawand on G (or Rast on G: B½♭) | G (deg 3) |
| Hijaz | Dukah / D | 0, 100, 400, 500, 700, 800, 1000, 1200 | Hijaz on D | Nahawand on G (or Rast on G) | G (deg 3) |
| Nahawand | Rast / C | 0, 200, 300, 500, 700, 800, 1100, 1200 | Nahawand on C | Hijaz on G (asc.); Kurd on G (desc.: B♭ = 1000) | G (deg 4) |
| Saba | Dukah / D | 0, 150, 300, 400, 700, 800, 1000, 1100 | Saba on D | Hijaz on F | F (deg 2) |
| Kurd | Dukah / D | 0, 100, 300, 500, 700, 800, 1000, 1200 | Kurd on D | Nahawand/Kurd on G | G (deg 3) |
| Ajam | Ajam / B♭ (often written on C) | 0, 200, 400, 500, 700, 900, 1100, 1200 | Ajam | Ajam on F | F (deg 4) |
| Sikah | Sikah / E½♭ | 0, 150, 350, 550, 700, 850, 1050, 1200 (one common form: E½♭ F G A B½♭ C D E½♭) | Sikah on E½♭ | Rast on G | G (deg 2) |

## Encoded in code
These rows are encoded in `src/lib/music/maqam/data/` (tones by Arabic name in `src/lib/music/notes.ts`) and locked by the reference table in `src/lib/music/maqam/engine.test.ts`. Correct the data **and** that table together; `npm test` validates every maqam against its ajnas.

## Notes for reviewers
- Saba does not close at the octave in its characteristic form (D♭ instead of D); the engine supports non-octave-repeating scales.
- Sikah-family maqamat vary a lot between traditions; treat the row above as a placeholder.
- Add Tunisian tbu' (e.g. Rast al-Dhil, Asba'in, Mhayyar 'Iraq, Hsin…) only from the club's teaching material — do not infer them from Mashriqi equivalents.
- Record the source for each correction (book, teacher, recording) in the data's `provenance`.
