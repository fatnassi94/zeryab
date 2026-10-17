"use client";

import type { MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/config";

export const SCROLL_KEY = "zr:lang-scroll";

/**
 * Each locale has its own root layout, so switching is a full document
 * navigation. The page cross-fades (CSS @view-transition), the active pill
 * morphs to its new spot, and the scroll position is carried over.
 */
export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");

  const remember = (e: MouseEvent<HTMLAnchorElement>) => {
    // Keep the query string and anchor of the current page.
    e.currentTarget.href += window.location.search + window.location.hash;
    try {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ path: rest, ratio: max > 0 ? window.scrollY / max : 0 }));
    } catch {
      // Storage unavailable (private mode): switching still works, just from the top.
    }
  };

  return (
    <div role="group" aria-label={label} className="relative flex gap-0.5 rounded-full bg-white/6 p-[3px] text-[13px]">
      {locales.map((l) => {
        const active = l === current;
        const href = `/${l}${rest ? `/${rest}` : ""}`;
        return (
          <a
            key={l}
            href={active ? undefined : href}
            hrefLang={l}
            lang={l}
            onClick={active ? undefined : remember}
            aria-current={active ? "true" : undefined}
            className={`relative inline-flex min-h-[38px] min-w-[44px] items-center justify-center rounded-full no-underline transition-colors duration-200 ${
              active ? "font-semibold text-ink hover:text-ink" : "text-muted hover:bg-white/8 hover:text-text"
            }`}
          >
            {active && <span aria-hidden="true" className="lang-pill absolute inset-0 rounded-full bg-text" />}
            <span className="relative">{localeLabels[l]}</span>
          </a>
        );
      })}
    </div>
  );
}
