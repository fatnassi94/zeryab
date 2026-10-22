import "server-only";
import type { Locale } from "@/i18n/config";
import { MAQAMAT } from "@/lib/music/maqam/data/maqamat";
import { contentLang, type Localized } from "./i18n";

/**
 * A maqam's name in the page language: the club's text (or its translation),
 * else the lab's name for that maqam, else the Arabic original marked as such.
 */
export function maqamName(m: Localized<{ slug: string; name: string }>, locale: Locale): { text: string; attrs: ReturnType<typeof contentLang> } {
  if (locale === "ar" || m.translatedFields.includes("name")) return { text: m.name, attrs: {} };
  const lab = MAQAMAT.find((x) => x.maqam === m.slug)?.names[locale];
  return lab ? { text: lab, attrs: {} } : { text: m.name, attrs: contentLang(m, "name", locale) };
}
