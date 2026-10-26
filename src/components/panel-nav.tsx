"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PanelNavItem } from "./panel-shell";

/** Panel links; the page you are on is marked from the address (anchors never are). */
export function PanelNav({ label, items }: { label: string; items: PanelNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="m-0 flex list-none gap-1 p-0 text-[15px] lg:flex-col">
        {items.map((item) => {
          const current = item.current ?? (!item.href.includes("#") && pathname === item.href);
          return (
            <li key={item.href} className="flex-none">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full px-3.5 whitespace-nowrap no-underline transition-colors lg:min-h-[46px] lg:rounded-[14px] ${
                  current ? "bg-gold/12 font-medium text-gold" : "text-muted hover:bg-white/4 hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
