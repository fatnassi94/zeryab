import type { Jins } from "../types";

const draft = {
  source: "Common Arab theoretical values on the 24-tone grid (see .claude/skills/arabic-maqam-theory-engine/references/maqam-data.md)",
  status: "draft",
  tradition: "mashriqi",
} as const;

export const AJNAS: Jins[] = [
  { id: "rast", names: { ar: "راست", fr: "Rast", en: "Rast" }, steps: [200, 150, 150], provenance: draft },
  { id: "bayati", names: { ar: "بياتي", fr: "Bayati", en: "Bayati" }, steps: [150, 150, 200], provenance: draft },
  { id: "hijaz", names: { ar: "حجاز", fr: "Hijaz", en: "Hijaz" }, steps: [100, 300, 100], provenance: draft },
  { id: "nahawand", names: { ar: "نهاوند", fr: "Nahawand", en: "Nahawand" }, steps: [200, 100, 200], provenance: draft },
  { id: "kurd", names: { ar: "كرد", fr: "Kurd", en: "Kurd" }, steps: [100, 200, 200], provenance: draft },
  { id: "ajam", names: { ar: "عجم", fr: "ʿAjam", en: "ʿAjam" }, steps: [200, 200, 100], provenance: draft },
  {
    id: "saba",
    names: { ar: "صبا", fr: "Saba", en: "Saba" },
    steps: [150, 150, 100],
    provenance: { ...draft, notes: "Trichord + diminished fourth (D–G♭)." },
  },
  {
    id: "sikah",
    names: { ar: "سيكاه", fr: "Sikah", en: "Sikah" },
    steps: [150, 200],
    provenance: { ...draft, notes: "Trichord; intonation of the tonic varies widely by tradition." },
  },
];
