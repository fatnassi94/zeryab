import type { Metadata, Viewport } from "next";
import { Readex_Pro, Reem_Kufi } from "next/font/google";
import { ScrollRestore } from "@/components/scroll-restore";
import { dirOf, hasLocale, locales } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import "../globals.css";

const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-reem-kufi",
});

const readexPro = Readex_Pro({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-readex-pro",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(hasLocale(lang) ? lang : "ar");
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    applicationName: dict.meta.title,
    appleWebApp: { capable: true, title: dict.meta.title, statusBarStyle: "black-translucent" },
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
  };
}

export const viewport: Viewport = {
  themeColor: "#0A0E1A",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const locale = await resolveLocale(params);
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${reemKufi.variable} ${readexPro.variable}`}>
      <body className="min-h-screen bg-ink text-text antialiased">
        <ScrollRestore />
        {children}
      </body>
    </html>
  );
}
