import { pitchClass, type Cents } from "./pitch";
import type { Locale, Provenance } from "./types";

/**
 * Arabic tone names (perde) with their theoretical position in cents above
 * Rast (C), on the common 24-tone grid. Spelling (letter + accidental) is
 * stored, not derived, so G♭ (Saba) and F♯ (Hijaz) stay distinct.
 *
 * Status: draft — names/positions of the upper octave in particular vary by
 * source; to be reviewed by the club's teachers.
 */
type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
type Accidental = "" | "♭" | "♯" | "½♭" | "½♯";

export type Tone = { ar: string; translit: string; cents: Cents; letter: Letter; accidental: Accidental };

export const TONES = {
  yakah: { ar: "يكاه", translit: "Yakah", cents: -500, letter: "G", accidental: "" },
  ushayran: { ar: "عشيران", translit: "ʿUshayran", cents: -300, letter: "A", accidental: "" },
  ajam_ushayran: { ar: "عجم عشيران", translit: "ʿAjam ʿUshayran", cents: -200, letter: "B", accidental: "♭" },
  iraq: { ar: "عراق", translit: "ʿIraq", cents: -150, letter: "B", accidental: "½♭" },
  kawasht: { ar: "كوشت", translit: "Kawasht", cents: -100, letter: "B", accidental: "" },
  rast: { ar: "راست", translit: "Rast", cents: 0, letter: "C", accidental: "" },
  zirkulah: { ar: "زيركولاه", translit: "Zirkulah", cents: 100, letter: "D", accidental: "♭" },
  dukah: { ar: "دوكاه", translit: "Dukah", cents: 200, letter: "D", accidental: "" },
  kurd: { ar: "كرد", translit: "Kurd", cents: 300, letter: "E", accidental: "♭" },
  sikah: { ar: "سيكاه", translit: "Sikah", cents: 350, letter: "E", accidental: "½♭" },
  busalik: { ar: "بوسليك", translit: "Busalik", cents: 400, letter: "E", accidental: "" },
  jaharkah: { ar: "جهاركاه", translit: "Jaharkah", cents: 500, letter: "F", accidental: "" },
  hijaz: { ar: "حجاز", translit: "Hijaz", cents: 600, letter: "F", accidental: "♯" },
  saba: { ar: "صبا", translit: "Saba", cents: 600, letter: "G", accidental: "♭" },
  nawa: { ar: "نوى", translit: "Nawa", cents: 700, letter: "G", accidental: "" },
  hisar: { ar: "حصار", translit: "Hisar", cents: 800, letter: "A", accidental: "♭" },
  husayni: { ar: "حسيني", translit: "Husayni", cents: 900, letter: "A", accidental: "" },
  ajam: { ar: "عجم", translit: "ʿAjam", cents: 1000, letter: "B", accidental: "♭" },
  awj: { ar: "أوج", translit: "Awj", cents: 1050, letter: "B", accidental: "½♭" },
  mahur: { ar: "ماهور", translit: "Mahur", cents: 1100, letter: "B", accidental: "" },
  kirdan: { ar: "كردان", translit: "Kirdan", cents: 1200, letter: "C", accidental: "" },
  shahnaz: { ar: "شهناز", translit: "Shahnaz", cents: 1300, letter: "D", accidental: "♭" },
  muhayyar: { ar: "محيّر", translit: "Muhayyar", cents: 1400, letter: "D", accidental: "" },
  sunbulah: { ar: "سنبلة", translit: "Sunbulah", cents: 1500, letter: "E", accidental: "♭" },
  buzurk: { ar: "بزرك", translit: "Buzurk", cents: 1550, letter: "E", accidental: "½♭" },
  mahuran: { ar: "ماهوران", translit: "Mahuran", cents: 1700, letter: "F", accidental: "" },
} as const satisfies Record<string, Tone>;

export type ToneId = keyof typeof TONES;

export const TONES_PROVENANCE: Provenance = {
  source: "Common Arab 24-tone theoretical tone names (draft compilation)",
  status: "draft",
  notes: "Upper-octave names and some enharmonic spellings differ between sources; Tunisian usage to be confirmed.",
};

const SOLFEGE: Record<Locale, Record<Letter, string>> = {
  ar: { C: "دو", D: "ري", E: "مي", F: "فا", G: "صول", A: "لا", B: "سي" },
  fr: { C: "do", D: "ré", E: "mi", F: "fa", G: "sol", A: "la", B: "si" },
  en: { C: "C", D: "D", E: "E", F: "F", G: "G", A: "A", B: "B" },
};

/** Western name of a tone in the reader's convention: "مي ½♭", "mi ½♭", "E½♭". */
export function westernName(id: ToneId, locale: Locale): string {
  const t: Tone = TONES[id];
  const base = SOLFEGE[locale][t.letter];
  if (!t.accidental) return base;
  return locale === "en" ? `${base}${t.accidental}` : `${base} ${t.accidental}`;
}

export const toneCents = (id: ToneId): Cents => TONES[id].cents;

/** All tone ids whose pitch class matches (e.g. 600 → hijaz and saba). */
export function tonesAt(cents: Cents, toleranceCents = 1): ToneId[] {
  const pc = pitchClass(cents);
  return (Object.keys(TONES) as ToneId[]).filter((id) => {
    const d = Math.abs(pitchClass(TONES[id].cents) - pc);
    return Math.min(d, 1200 - d) <= toleranceCents;
  });
}
