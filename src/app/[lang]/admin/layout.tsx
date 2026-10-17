import Link from "next/link";
import { PanelShell } from "@/components/panel-shell";
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
    { href: `/${locale}/members`, label: dict.nav.mySpace },
  ];

  return (
    <PanelShell
      navLabel={dict.admin.navLabel}
      items={items}
      brand={
        <Link href={`/${locale}`} className="flex flex-col gap-0.5 text-text no-underline hover:text-text lg:px-2.5">
          <span className="font-display text-xl font-bold lg:text-2xl">{dict.meta.title}</span>
          <span className="text-[13px] text-gold">{dict.admin.title}</span>
        </Link>
      }
      footer={
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn-ghost min-h-11! px-4! text-sm lg:w-full">{dict.nav.logout}</button>
        </form>
      }
    >
      {children}
    </PanelShell>
  );
}
