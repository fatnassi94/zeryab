import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { LanguageSwitcher } from "./language-switcher";
import { LockIcon, LogoMark } from "./logo";
import { MenuDisclosure } from "./menu-disclosure";

type Active = "home" | "events" | "academy" | "library" | "join" | null;

export async function SiteHeader({ locale, active = null }: { locale: Locale; active?: Active }) {
  const dict = getDictionary(locale);
  const viewer = await getViewer();
  const base = `/${locale}`;

  const links: { key: Active; href: string; label: string; locked?: boolean }[] = [
    { key: "home", href: base, label: dict.nav.home },
    { key: "events", href: `${base}/events`, label: dict.nav.events },
    { key: "academy", href: `${base}/academy`, label: dict.nav.academy },
    { key: "library", href: `${base}/members`, label: dict.nav.library, locked: !viewer?.isActive },
  ];

  const account = viewer
    ? { href: viewer.isAdmin ? `${base}/admin` : `${base}/members`, label: viewer.isAdmin ? dict.nav.admin : dict.nav.mySpace }
    : { href: `${base}/login`, label: dict.nav.login };

  return (
    <header className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="relative flex items-center justify-between gap-2 rounded-full border border-white/10 bg-ink/55 py-2 ps-4 pe-2 backdrop-blur-md sm:gap-4 sm:py-2.5 sm:ps-5 sm:pe-3">
        <Link href={base} aria-label={dict.meta.title} className="flex min-w-0 items-center gap-2 text-text no-underline hover:text-text sm:gap-2.5">
          <LogoMark />
          <span aria-hidden="true" className="font-display text-lg font-bold whitespace-nowrap max-[399px]:hidden sm:text-2xl">{dict.meta.title}</span>
        </Link>

        <nav aria-label={dict.nav.main} className="hidden items-center gap-x-6 text-[15px] lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active === l.key ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap no-underline transition-colors ${
                active === l.key ? "font-medium text-text" : "text-muted hover:text-text"
              }`}
            >
              {l.locked && <LockIcon />}
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-none items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher current={locale} label={dict.nav.language} />
          <Link href={account.href} className="btn-gold hidden min-h-11! px-5! text-[15px] whitespace-nowrap lg:inline-flex">
            {account.label}
          </Link>

          {/* Phones and tablets: one compact row, links in a disclosure panel. */}
          <MenuDisclosure className="group lg:hidden">
            <summary
              aria-label={dict.nav.menu}
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-white/8 text-text [&::-webkit-details-marker]:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h10" />
                <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </summary>
            <div className="absolute inset-x-0 top-[calc(100%+8px)] flex flex-col gap-1 rounded-3xl border border-white/10 bg-panel/95 p-3 shadow-pop backdrop-blur-xl">
              <nav aria-label={dict.nav.main} className="flex flex-col text-base">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active === l.key ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-2 rounded-2xl px-4 no-underline ${
                      active === l.key ? "bg-white/6 font-medium text-text" : "text-soft hover:bg-white/4 hover:text-text"
                    }`}
                  >
                    {l.locked && <LockIcon />}
                    {l.label}
                  </Link>
                ))}
              </nav>
              <Link href={account.href} className="btn-gold mt-2 w-full">{account.label}</Link>
            </div>
          </MenuDisclosure>
        </div>
      </div>
    </header>
  );
}
