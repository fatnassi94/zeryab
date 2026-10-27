import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { fill, formatDate, formatTime, getDictionary } from "@/i18n/server";
import { getUnansweredPosts } from "@/lib/data/posts";
import { MenuDisclosure } from "./menu-disclosure";

/** Bell for active members: club posts (rehearsals, meetings…) still waiting for their answer. */
export async function NotificationBell({ locale, viewerId }: { locale: Locale; viewerId: string }) {
  const dict = getDictionary(locale);
  const t = dict.notifications;
  const posts = await getUnansweredPosts(viewerId);
  const n = posts.length;
  const href = `/${locale}/members#posts`;

  return (
    <MenuDisclosure className="group relative">
      <summary
        aria-label={n ? fill(t.waiting, { n }) : t.label}
        className="relative flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-white/8 text-text [&::-webkit-details-marker]:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {n > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -end-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[11px] leading-5 font-semibold text-ink">
            {n > 9 ? "9+" : n}
          </span>
        )}
      </summary>
      <div className="absolute end-0 top-[calc(100%+8px)] z-30 flex w-[min(320px,calc(100vw-32px))] flex-col gap-1 rounded-3xl border border-white/10 bg-panel/95 p-3 shadow-pop backdrop-blur-xl">
        <p className="m-0 px-2 pt-1 pb-2 text-sm font-medium text-soft">{n ? fill(t.waiting, { n }) : t.none}</p>
        {posts.slice(0, 5).map((p) => (
          <Link key={p.id} href={href} className="flex flex-col gap-0.5 rounded-2xl px-3 py-2.5 text-text no-underline hover:bg-white/5 hover:text-text">
            <span className="text-xs text-gold">{dict.admin.posts.kinds[p.kind as keyof typeof dict.admin.posts.kinds] ?? p.kind}</span>
            <span className="font-medium">{p.title}</span>
            <span className="text-xs text-muted">{formatDate(locale, p.starts_at, { weekday: "long" })} · {formatTime(locale, p.starts_at)}{p.venue ? ` · ${p.venue}` : ""}</span>
          </Link>
        ))}
        <Link href={href} className="btn-ghost mt-1 min-h-10! text-sm">{n ? t.answer : t.all}</Link>
      </div>
    </MenuDisclosure>
  );
}
