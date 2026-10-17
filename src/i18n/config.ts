export const locales = ["ar", "fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const dirOf = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

export const localeLabels: Record<Locale, string> = { ar: "ع", fr: "FR", en: "EN" };

/** BCP 47 tags for Intl formatting; Tunisian calendar conventions. */
export const intlLocale: Record<Locale, string> = { ar: "ar-TN", fr: "fr-TN", en: "en-GB" };
