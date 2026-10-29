import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";

/** One line under a form that collects personal data, linking the privacy policy. */
export function PrivacyNote({ locale, className = "" }: { locale: Locale; className?: string }) {
  const t = getDictionary(locale).privacy;
  return (
    <p className={`m-0 text-[13px] text-muted ${className}`}>
      {t.note} <Link href={`/${locale}/privacy`}>{t.noteLink}</Link>.
    </p>
  );
}
