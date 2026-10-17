import Link from "next/link";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { signOut } from "../login/actions";

export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  await requireRole(locale, ["teacher", "activity_manager", "librarian", "admin"]);
  const n = dict.admin.nav;
  const base = `/${locale}/admin`;

  // Sections other than the overview are being built; they anchor into it for now.
  const items = [
    { href: base, label: n.overview, current: true },
    { href: `${base}#requests`, label: n.requests },
    { href: `${base}#log`, label: n.log },
    { href: `/${locale}/events`, label: n.events },
    { href: `/${locale}/academy`, label: n.academy },
  ];

  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="box-border flex max-w-full flex-[1_1_min(260px,100%)] flex-col gap-6 border-e border-white/7 bg-rail px-4 py-7">
        <Link href={`/${locale}`} className="flex flex-col gap-0.5 px-2.5 text-text no-underline hover:text-text">
          <span className="font-display text-2xl font-bold">{dict.meta.title}</span>
          <span className="text-[13px] text-gold">{dict.admin.title}</span>
        </Link>
        <nav aria-label={dict.admin.navLabel} className="flex flex-col gap-1 text-[15px]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={`flex min-h-[46px] items-center rounded-[14px] px-3.5 no-underline ${
                item.current ? "bg-gold/12 font-medium text-gold" : "text-muted hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link href={`/${locale}/members`} className="flex min-h-[46px] items-center rounded-[14px] px-3.5 text-muted no-underline hover:text-text">
            {dict.nav.mySpace}
          </Link>
        </nav>
        <form action={signOut} className="mt-auto px-1">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn-ghost w-full">{dict.nav.logout}</button>
        </form>
      </aside>
      <main className="box-border flex min-w-0 flex-[999_1_min(560px,100%)] flex-col gap-6 p-4 sm:p-9">{children}</main>
    </div>
  );
}
