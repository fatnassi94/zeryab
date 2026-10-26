import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { hasLocale } from "@/i18n/config";
import { formatDate, formatNumber, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { getActiveMembers, tallyAnswers, type PostRow, type Tally } from "@/lib/data/posts";
import { notStartedYet, startedSince, type PostKind } from "@/lib/posts";
import { MEMBER_PARTS } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";
import { cancelPost } from "./actions";
import { PostForm } from "./post-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/posts">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.posts.title };
}

/** Posts for the members (rehearsals, meetings…), with who comes, who does not, who has not answered. */
export default async function PostsAdminPage({ params }: PageProps<"/[lang]/admin/posts">) {
  const locale = await resolveLocale(params);
  await requireRole(locale, ["activity_manager"]);
  const dict = getDictionary(locale);
  const t = dict.admin.posts;
  const n = (v: number) => formatNumber(locale, v);

  const supabase = await createClient();
  const since = startedSince();
  const cols = "id, kind, title, description, venue, starts_at, status";
  const [{ data: upcoming }, { data: past }, members] = await Promise.all([
    supabase.from("events").select(cols).eq("visibility", "members").in("status", ["published", "cancelled"]).gte("starts_at", since).order("starts_at").limit(30),
    supabase.from("events").select(cols).eq("visibility", "members").in("status", ["published", "completed"]).lt("starts_at", since).order("starts_at", { ascending: false }).limit(10),
    getActiveMembers(),
  ]);
  const all = [...(upcoming ?? []), ...(past ?? [])] as PostRow[];
  const { tallies } = await tallyAnswers(all.map((p) => p.id), members);

  const card = (p: PostRow, tally: Tally | undefined) => (
    <li key={p.id} className="card flex flex-col gap-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{t.kinds[p.kind as PostKind] ?? p.kind}</span>
        {p.status === "cancelled" && <span className="chip bg-rose/15! text-rose!">{t.cancelled}</span>}
        <span className="text-sm text-muted">{formatDate(locale, p.starts_at, { weekday: "long" })} · {formatTime(locale, p.starts_at)}{p.venue ? ` · ${p.venue}` : ""}</span>
      </div>
      <h3 className="m-0 font-display text-2xl font-semibold">{p.title}</h3>
      {p.description && <p className="m-0 line-clamp-3 leading-[1.8] whitespace-pre-line text-soft">{p.description}</p>}
      {tally && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip chip-teal">{t.yes}: {n(tally.yes)}</span>
            <span className="chip bg-rose/15! text-rose!">{t.no}: {n(tally.no)}</span>
            {tally.maybe > 0 && <span className="chip">{t.maybe}: {n(tally.maybe)}</span>}
            <span className="chip bg-white/8! text-muted!">{t.noAnswer}: {n(tally.none)}</span>
          </div>
          <p className="m-0 text-[13px] text-muted">
            {t.byPart}: {MEMBER_PARTS.map((part) => `${dict.parts[part]} ${n(tally.yesByPart[part])}`).join(" · ")}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={`/${locale}/admin/posts/${p.id}`} className="btn-gold min-h-10! px-4! text-sm">{t.open}</Link>
        {p.status === "published" && notStartedYet(p.starts_at) && (
          <form action={cancelPost}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="btn-ghost min-h-10! px-4! text-sm">{t.cancel}</button>
          </form>
        )}
      </div>
    </li>
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{t.title}</h1>
        <p className="m-0 text-muted">{t.intro}</p>
      </div>

      <section aria-labelledby="new-h" className="card flex flex-col gap-4 p-6">
        <h2 id="new-h" className="m-0 font-display text-[22px] font-semibold">{t.new}</h2>
        <PostForm locale={locale} labels={t} />
      </section>

      <section aria-labelledby="up-h" className="flex flex-col gap-3">
        <h2 id="up-h" className="m-0 font-display text-[22px] font-semibold">{t.upcoming}</h2>
        {!upcoming?.length ? <EmptyState title={t.none} /> : <ul className="m-0 flex list-none flex-col gap-4 p-0">{(upcoming as PostRow[]).map((p) => card(p, tallies.get(p.id)))}</ul>}
      </section>

      {!!past?.length && (
        <section aria-labelledby="past-h" className="flex flex-col gap-3">
          <h2 id="past-h" className="m-0 font-display text-[22px] font-semibold">{t.past}</h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">{(past as PostRow[]).map((p) => card(p, tallies.get(p.id)))}</ul>
        </section>
      )}
    </>
  );
}
