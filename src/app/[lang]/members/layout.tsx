import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { PanelShell } from "@/components/panel-shell";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { isStaff, requireViewer } from "@/lib/auth";
import { signOut } from "../login/actions";

export default async function MembersLayout({ children, params }: LayoutProps<"/[lang]/members">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const viewer = await requireViewer(locale, `/${locale}/members`);
  const base = `/${locale}`;

  const items = [
    { href: `${base}/members`, label: dict.members.nav.dashboard },
    { href: `${base}/members#posts`, label: dict.members.nav.posts },
    { href: `${base}/members#agenda`, label: dict.members.nav.schedule },
    { href: `${base}/members#recs`, label: dict.members.nav.recordings },
    { href: `${base}/members#files`, label: dict.members.nav.files },
    { href: `${base}/academy`, label: dict.members.nav.academy },
    ...(isStaff(viewer) ? [{ href: `${base}/admin`, label: dict.nav.admin }] : []),
  ];

  return (
    <PanelShell
      navLabel={dict.members.navLabel}
      items={items}
      brand={
        <div className="flex items-center justify-between gap-3 lg:px-2.5">
          <Link href={base} className="flex items-center gap-2.5 text-text no-underline hover:text-text">
            <LogoMark />
            <span className="font-display text-xl font-bold lg:text-2xl">{dict.meta.title}</span>
          </Link>
          {viewer.isActive && <NotificationBell locale={locale} viewerId={viewer.id} />}
        </div>
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
