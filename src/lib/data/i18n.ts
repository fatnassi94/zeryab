import "server-only";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

type TranslationMap = Map<string, Record<string, string>>;

/** Translated fields for a set of rows, keyed by entity id then field. */
export async function getTranslations(entityType: string, ids: string[], locale: Locale): Promise<TranslationMap> {
  if (!ids.length || locale === "ar") return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("translations")
    .select("entity_id, field, value")
    .eq("entity_type", entityType)
    .eq("locale", locale)
    .in("entity_id", ids);
  const map: TranslationMap = new Map();
  for (const row of data ?? []) {
    const entry = map.get(row.entity_id) ?? {};
    entry[row.field] = row.value;
    map.set(row.entity_id, entry);
  }
  return map;
}

export type Localized<T> = T & { translatedFields: string[] };

/** Applies translations onto rows, falling back to the original text. */
export function localize<T extends { id: string }>(rows: T[], tr: TranslationMap): Localized<T>[] {
  return rows.map((row) => {
    const t = tr.get(row.id) ?? {};
    return { ...row, ...t, translatedFields: Object.keys(t) };
  });
}

/**
 * Attributes for an element showing a content field. When the field fell back
 * to the original (Arabic) text on a French/English page, it is marked with its
 * real language so screen readers, fonts and line breaking treat it correctly.
 */
export function contentLang(
  row: { translatedFields?: string[] },
  field: string,
  locale: Locale,
  original: Locale = "ar",
): { lang?: string; dir?: "auto" } {
  if (locale === original || row.translatedFields?.includes(field)) return {};
  return { lang: original, dir: "auto" };
}
