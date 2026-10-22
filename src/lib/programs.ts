import type { Locale } from "@/i18n/config";

/**
 * Show programs ("necklaces"): the group's own program PDFs, displayed page by
 * page (pre-rendered WebP in public/programs/<slug>/) so they read on any phone,
 * plus the few facts the page needs to explain the program's idea.
 * Titles and song names are written exactly as in the PDF.
 */
export type ProgramIcon = "train" | "boat" | "nile" | "window" | "dome";

export type ProgramSong = { n: number; title: string; page: number };

/** Where a tableau sits on the journey map, and the leg that leaves it (waypoints as [longitude, latitude]). */
export type ProgramStop = {
  name: Record<Locale, string>;
  lon: number;
  lat: number;
  label: "left" | "right" | "below";
  /** `of`: the tableau this leg belongs to (its colour). */
  leg: { style: "rails" | "river" | "sea" | "path" | "onward"; of: number; via: [number, number][] };
};

export type ProgramTableau = {
  n: number;
  title: Record<Locale, string>;
  /** Mood colour of the tableau, used for its bead arc and markers. */
  color: string;
  icon: ProgramIcon;
  page: number;
  songs: ProgramSong[];
  stop: ProgramStop;
};

export type ProgramPage = {
  n: number;
  /** Tableau shown on this page (0 for the cover). */
  tableau: number;
  /** The tableau starts on this page (otherwise it continues from the page before). */
  starts: boolean;
  /** Page carries a large illustration (dimmed rather than inverted in dark rooms). */
  illustrated: boolean;
};

export type Program = {
  slug: string;
  series: Record<Locale, string>;
  title: Record<Locale, string>;
  orbit: Record<Locale, string>;
  /** Note at the centre of the necklace. */
  centre: Record<Locale, string>;
  summary: Record<Locale, string>;
  /** The idea in four plain steps, one per stage of the animated necklace. */
  steps: Record<Locale, [string, string, string, string]>;
  tableaux: ProgramTableau[];
  pages: ProgramPage[];
  pdfBytes: number;
  next?: Record<Locale, string>;
};

export const PROGRAMS: Program[] = [
  {
    slug: "al-aqd-al-khalis",
    series: { ar: "العقد الأوّل", fr: "Premier collier", en: "The First Necklace" },
    title: { ar: "العقد الخالص", fr: "Le Collier pur", en: "The Pure Necklace" },
    orbit: { ar: "المدار المقامي: جهارفا — Fa", fr: "Orbite modale : Jahar-Fa", en: "Modal orbit: Jahar–Fa" },
    centre: { ar: "فا", fr: "Fa", en: "F" },
    summary: {
      ar: "سبع أغانٍ تُغنّى كرحلة واحدة، من قطار في نورماندي إلى مقامٍ في المنستير، في خمس لوحات.",
      fr: "Sept chansons chantées comme un seul voyage, d’un train en Normandie à un sanctuaire de Monastir, en cinq tableaux.",
      en: "Seven songs sung as one journey, from a train in Normandy to a shrine in Monastir, in five tableaux.",
    },
    steps: {
      ar: [
        "سبع أغانٍ، وكلّ أغنية حبّة.",
        "لا صمت بينها: تنغيمٌ قصير يربط كلّ أغنية بالتي بعدها، كخيط العقد.",
        "والعقد رحلة: قطار، فزورق على النيل، فمصر، فنافذة على البحر، فمقام.",
        "والرحلة كلّها تدور حول نغمة واحدة: فا.",
      ],
      fr: [
        "Sept chansons : chacune est une perle.",
        "Aucun silence entre elles : un court fredonnement relie chaque chanson à la suivante, comme le fil d’un collier.",
        "Et le collier est un voyage : un train, une barque sur le Nil, l’Égypte, une fenêtre sur la mer, un sanctuaire.",
        "Et tout le voyage tourne autour d’une seule note : fa.",
      ],
      en: [
        "Seven songs, each one a bead.",
        "No silence between them: a short hum ties each song to the next, like the thread of a necklace.",
        "And the necklace is a journey: a train, a boat on the Nile, Egypt, a window on the sea, a shrine.",
        "And the whole journey circles a single note: F.",
      ],
    },
    tableaux: [
      { n: 1, title: { ar: "قطار في نورماندي", fr: "Un train en Normandie", en: "A Train in Normandy" }, color: "#9db4d3", icon: "train", page: 2,
        stop: { name: { ar: "نورماندي", fr: "Normandie", en: "Normandy" }, lon: 0.21, lat: 49.71, label: "right",
          leg: { style: "rails", of: 1, via: [[-1.5, 43.5], [0.5, 35], [6, 26], [15, 19.5], [24, 16.5]] } },
        songs: [{ n: 1, title: "القطار", page: 2 }] },
      { n: 2, title: { ar: "زورق على النيل الأزرق", fr: "Une barque sur le Nil Bleu", en: "A Boat on the Blue Nile" }, color: "#4f93d8", icon: "boat", page: 4,
        stop: { name: { ar: "الخرطوم", fr: "Khartoum", en: "Khartoum" }, lon: 32.53, lat: 15.59, label: "below",
          leg: { style: "river", of: 2, via: [[33.33, 19.53], [31.8, 18.47], [30.48, 19.18], [31.33, 21.8], [32.9, 24.09], [32.64, 25.69], [31.18, 27.18]] } },
        songs: [{ n: 2, title: "نعناع الجنينة السودانية", page: 4 }] },
      { n: 3, title: { ar: "هبة النيل", fr: "Le Don du Nil", en: "The Gift of the Nile" }, color: "#d4a43f", icon: "nile", page: 5,
        stop: { name: { ar: "القاهرة", fr: "Le Caire", en: "Cairo" }, lon: 31.24, lat: 30.04, label: "left",
          leg: { style: "sea", of: 4, via: [[32.55, 29.97], [34.6, 27.4], [38.6, 21.4], [42.1, 15.2], [43.4, 12.6]] } },
        songs: [{ n: 3, title: "نعناع الجنينة المصريّة", page: 5 }] },
      { n: 4, title: { ar: "نافذة على الهنديّ", fr: "Une fenêtre sur l’océan Indien", en: "A Window on the Indian Ocean" }, color: "#e8846f", icon: "window", page: 7,
        stop: { name: { ar: "عدن", fr: "Aden", en: "Aden" }, lon: 45.03, lat: 12.79, label: "right",
          leg: { style: "path", of: 5, via: [[44.5, 16], [41, 22.5], [37.5, 28.2], [33.5, 31.8], [27, 32.6], [20, 32.6], [14, 33.6]] } },
        songs: [{ n: 4, title: "حرام الشك ما بينك و بيني", page: 7 }] },
      { n: 5, title: { ar: "مقام إلى عشق", fr: "Un maqâm vers l’amour", en: "A Maqam toward Love" }, color: "#c9774b", icon: "dome", page: 8,
        stop: { name: { ar: "المنستير", fr: "Monastir", en: "Monastir" }, lon: 10.83, lat: 35.77, label: "left",
          leg: { style: "onward", of: 5, via: [[5, 33.2], [-1, 30.6], [-6.5, 29.6]] } },
        songs: [{ n: 5, title: "يا ذروة المعالي", page: 8 }, { n: 6, title: "يا مازري", page: 9 }, { n: 7, title: "مرض الهوى", page: 10 }] },
    ],
    pages: [
      { n: 1, tableau: 0, starts: true, illustrated: false },
      { n: 2, tableau: 1, starts: true, illustrated: true },
      { n: 3, tableau: 1, starts: false, illustrated: false },
      { n: 4, tableau: 2, starts: true, illustrated: true },
      { n: 5, tableau: 3, starts: true, illustrated: true },
      { n: 6, tableau: 3, starts: false, illustrated: false },
      { n: 7, tableau: 4, starts: true, illustrated: true },
      { n: 8, tableau: 5, starts: true, illustrated: true },
      { n: 9, tableau: 5, starts: false, illustrated: false },
      { n: 10, tableau: 5, starts: false, illustrated: false },
    ],
    pdfBytes: 1981653,
    next: { ar: "عقد العلّة", fr: "Le collier de la ʿilla", en: "ʿIqd al-ʿIlla" },
  },
];

export const getProgram = (slug: string) => PROGRAMS.find((p) => p.slug === slug) ?? null;

/** Public files of a program (rendered pages and the original PDF). */
export const programAsset = {
  pdf: (slug: string) => `/programs/${slug}/program.pdf`,
  tableau: (slug: string, n: number) => `/programs/${slug}/lawha-${n}.jpg`,
  page: (slug: string, n: number, size: "sm" | "lg" = "lg") => `/programs/${slug}/page-${String(n).padStart(2, "0")}${size === "sm" ? "-sm" : ""}.webp`,
};

/** Every rendered page is 1600×2263 (A4); the small set is half that. */
export const PAGE_SIZE = { width: 1600, height: 2263 } as const;

/** What a page shows, for its caption and alt text ("continued" carries a {title} slot). */
export function pageSubject(program: Program, page: ProgramPage, locale: Locale, t: { cover: string; continued: string }) {
  if (page.tableau === 0) return t.cover;
  const title = program.tableaux[page.tableau - 1].title[locale];
  return page.starts ? title : t.continued.replace("{title}", title);
}

/** Songs in order, with the tableau each belongs to. */
export const programSongs = (p: Program) => p.tableaux.flatMap((t) => t.songs.map((s) => ({ ...s, tableau: t })));
