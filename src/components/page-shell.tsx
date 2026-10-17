import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type Active = Parameters<typeof SiteHeader>[0]["active"];

export function PageShell({ locale, active, children }: { locale: Locale; active?: Active; children: ReactNode }) {
  return (
    <>
      <SiteHeader locale={locale} active={active} />
      <main className="mx-auto max-w-[1280px] px-4 pt-10 pb-24 sm:px-6">{children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}
