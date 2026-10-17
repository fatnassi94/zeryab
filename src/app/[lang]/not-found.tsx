import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { lang } from "next/root-params";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";

export default async function NotFound() {
  const current = await lang();
  const locale = hasLocale(current) ? current : "ar";
  const dict = getDictionary(locale);
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="mx-auto flex max-w-[640px] flex-col items-center gap-5 px-4 py-24 text-center">
        <h1 className="m-0 font-display text-5xl font-bold text-gold">404</h1>
        <p className="m-0 text-lg text-soft">{dict.common.notFound}</p>
        <Link href={`/${locale}`} className="btn-gold">{dict.common.backHome}</Link>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
