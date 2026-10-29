import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const base = `/${locale}`;
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-6">
      
        <nav aria-label={dict.footer.links} className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href={`${base}/events`} className="text-muted">{dict.nav.events}</Link>
          <Link href={`${base}/library`} className="text-muted">{dict.nav.library}</Link>
          <Link href={`${base}/academy`} className="text-muted">{dict.nav.academy}</Link>
          <Link href={`${base}/join`} className="text-muted">{dict.join.cta}</Link>
          <Link href={`${base}/privacy`} className="text-muted">{dict.footer.privacy}</Link>
        </nav>
      </div>
    </footer>
  );
}
