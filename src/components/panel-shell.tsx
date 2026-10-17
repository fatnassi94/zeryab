import Link from "next/link";
import type { ReactNode } from "react";

export type PanelNavItem = { href: string; label: string; current?: boolean };

/**
 * Layout for the members' space and the admin panel.
 * Desktop (lg+): sidebar beside the content, as in the approved design.
 * Phones/tablets: a compact top bar with a horizontally scrolling nav, so the
 * content starts on the first screen instead of after the whole menu.
 */
export function PanelShell({ brand, navLabel, items, footer, children }: {
  brand: ReactNode;
  navLabel: string;
  items: PanelNavItem[];
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="sticky top-0 z-20 flex flex-col gap-3 border-b border-white/7 bg-rail/95 px-4 pt-3 pb-2 backdrop-blur-md lg:static lg:h-auto lg:w-[260px] lg:flex-none lg:gap-7 lg:border-e lg:border-b-0 lg:bg-rail lg:px-4 lg:py-7">
        <div className="flex items-center justify-between gap-3">
          {brand}
          <div className="lg:hidden">{footer}</div>
        </div>
        <nav aria-label={navLabel} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="m-0 flex list-none gap-1 p-0 text-[15px] lg:flex-col">
            {items.map((item) => (
              <li key={item.href} className="flex-none">
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-full px-3.5 whitespace-nowrap no-underline transition-colors lg:min-h-[46px] lg:rounded-[14px] ${
                    item.current ? "bg-gold/12 font-medium text-gold" : "text-muted hover:bg-white/4 hover:text-text"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto hidden px-1 lg:block">{footer}</div>
      </aside>
      <main className="box-border flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-9">{children}</main>
    </div>
  );
}
