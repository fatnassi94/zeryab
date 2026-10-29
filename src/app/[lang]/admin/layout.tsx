import Link from "next/link";
import { PanelShell } from "@/components/panel-shell";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { signOut } from "../login/actions";

export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const viewer = await requireRole(locale, ["teacher", "activity_manager", "librarian", "admin"]);
  const n = dict.admin.nav;
  const base = `/${locale}/admin`;

  const items = [
    { href: base, label: n.overview },
    ...(viewer.isAdmin ? [{ href: `${base}/members`, label: n.members }] : []),
    ...(viewer.has("activity_manager") ? [{ href: `${base}/posts`, label: n.posts }] : []),
    ...(viewer.has("librarian") ? [{ href: `${base}/archive`, label: n.archive }] : []),
    { href: `${base}#log`, label: n.log },
    { href: `/${locale}/library`, label: n.library },
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
