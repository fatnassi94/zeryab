import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { isStaff, requireViewer } from "@/lib/auth";
import { signOut } from "../login/actions";

export default async function MembersLayout({ children, params }: LayoutProps<"/[lang]/members">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const viewer = await requireViewer(locale, `/${locale}/members`);
  const base = `/${locale}`;

  const nav = [
    { href: `${base}/members`, label: dict.members.nav.dashboard, current: true },
    { href: `${base}/members#agenda`, label: dict.members.nav.schedule },
    { href: `${base}/members#recs`, label: dict.members.nav.recordings },
    { href: `${base}/members#files`, label: dict.members.nav.files },
    { href: `${base}/academy`, label: dict.members.nav.academy },
  ];

  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="box-border flex max-w-full flex-[1_1_min(260px,100%)] flex-col gap-7 border-e border-white/7 bg-rail px-4 py-7">
        <Link href={base} className="flex items-center gap-2.5 px-2.5 text-text no-underline hover:text-text">
          <LogoMark />
          <span className="font-display text-2xl font-bold">{dict.meta.title}</span>
        </Link>
        <nav aria-label={dict.members.navLabel} className="flex flex-col gap-1 text-[15px]">
          {nav.map((item) => (
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
          {isStaff(viewer) && (
            <Link href={`${base}/admin`} className="flex min-h-[46px] items-center rounded-[14px] px-3.5 text-muted no-underline hover:text-text">
              {dict.nav.admin}
            </Link>
          )}
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
