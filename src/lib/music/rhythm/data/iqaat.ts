import { parseSkeleton } from "../engine";
import type { Iqa } from "../types";

/**
 * Starter iqaʿat — commonly taught Mashriqi skeletons, status draft, to be
 * reviewed by a club percussionist. Tunisian cycles (barwal, btayhi, draj,
 * khatm…) are deliberately NOT encoded here: they must come from the club's
 * teachers with a documented source.
 */
const draft = {
  source: "Commonly taught skeletons (see .claude/skills/arabic-rhythm-engine/references/iqaat.md)",
  status: "draft",
  tradition: "mashriqi",
} as const;

function iqa(def: Omit<Iqa, "pulses" | "events" | "tradition" | "provenance"> & { skeleton: string; notes?: string }): Iqa {
  const { skeleton, notes, ...rest } = def;
  return { ...rest, ...parseSkeleton(skeleton), tradition: "mashriqi", provenance: notes ? { ...draft, notes } : draft };
}

export const IQAAT: Iqa[] = [
  iqa({ id: "maqsum", names: { ar: "مقسوم", fr: "Maqsoum", en: "Maqsum" }, pulseUnit: 8, meter: "4/4", skeleton: "D T . T D . T .", tempoRange: [80, 140] }),
  iqa({ id: "baladi", names: { ar: "بلدي", fr: "Baladi", en: "Baladi" }, pulseUnit: 8, meter: "4/4", skeleton: "D D . T D . T .", tempoRange: [80, 130] }),
  iqa({ id: "saidi", names: { ar: "صعيدي", fr: "Saïdi", en: "Saʿidi" }, pulseUnit: 8, meter: "4/4", skeleton: "D T . D D . T .", tempoRange: [90, 140] }),
  iqa({
    id: "wahda",
    names: { ar: "وحدة", fr: "Wahda", en: "Wahda" },
    pulseUnit: 8,
    meter: "4/4",
    skeleton: "D . . T . . T .",
    notes: "Slow forms (wahda kabira) vary; this is the simple skeleton.",
  }),
  iqa({
    id: "malfuf",
    names: { ar: "ملفوف", fr: "Malfouf", en: "Malfuf" },
    pulseUnit: 16,
    meter: "2/4",
    grouping: [3, 3, 2],
    skeleton: "D . . T . . T .",
    tempoRange: [90, 160],
  }),
  iqa({
    id: "samai-thaqil",
    names: { ar: "سماعي ثقيل", fr: "Samâʿî thaqîl", en: "Samaʿi thaqil" },
    pulseUnit: 8,
    meter: "10/8",
    grouping: [3, 2, 2, 3],
    skeleton: "D . . T . D D T . .",
    notes: "Used for samaʿi and many muwashshahat; grouping as commonly taught.",
  }),
];
