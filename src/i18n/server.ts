import "server-only";
import { notFound } from "next/navigation";
import { hasLocale, intlLocale, type Locale } from "./config";
import ar from "./dictionaries/ar";
import en from "./dictionaries/en";
import fr from "./dictionaries/fr";

const dictionaries = { ar, fr, en };

/** Resolves the `[lang]` segment or 404s for an unknown locale. */
export async function resolveLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return lang;
}

export const getDictionary = (locale: Locale) => dictionaries[locale];

/** Fills `{name}` placeholders. */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

const TZ = "Africa/Tunis";

export function formatDate(locale: Locale, value: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    ...opts,
  }).format(new Date(value));
}

export function formatTime(locale: Locale, value: string | Date) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatNumber(locale: Locale, value: number) {
  return new Intl.NumberFormat(intlLocale[locale]).format(value);
}
