# Starter iqa'at — status: draft, needs review by a club percussionist

Notation: one symbol per pulse. **D** = dum (low, centre), **T** = tak (high, edge), **k** = ka (light, other hand), **.** = rest. These are commonly taught skeletons; teachers may prefer different groupings or fills. Record the source when correcting.

| Iqa' | Pulses (unit) | Skeleton | Notes |
|---|---|---|---|
| Maqsum | 8 (eighths, 4/4) | `D T . T D . T .` | Very common; fills add k between strokes |
| Baladi | 8 (4/4) | `D D . T D . T .` | Two opening dums |
| Sa'idi | 8 (4/4) | `D T . D D . T .` | Two dums in the middle |
| Masmudi saghir | — | not encoded | Same family as baladi; verify local usage |
| Wahda | 8 (4/4) | `D . . T . . T .` | Slow forms (wahda kabira) vary |
| Malfuf | 8 (sixteenths, 2/4) | `D . . T . . T .` | Grouping 3+3+2 |
| Ayyub | — | not encoded | Notations differ between sources; encode only after a percussionist confirms |
| Samai thaqil | 10 (eighths, 10/8) | `D . . T . D D T . .` | Grouping commonly 3+2+2+3; used for samai/muwashshahat |
| Dawr hindi | — | not encoded | Verify against teaching practice before encoding |

## Encoded in code
Maqsum, baladi, sa'idi, wahda, malfuf and samai thaqil are in `src/lib/music/rhythm/data/iqaat.ts`, locked by `src/lib/music/rhythm/engine.test.ts`.

## Tunisian iqa'at (to be supplied by the club)
Tunisian malouf uses its own cycles (names such as barwal, btayhi, draj, khatm and others appear in nouba movements). **Do not fill these in from memory or from Mashriqi equivalents** — enter them only from the club's teachers or documented sources, with provenance.
