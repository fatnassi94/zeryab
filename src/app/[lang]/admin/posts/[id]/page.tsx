import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { formatDate, formatNumber, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { getActiveMembers, tallyAnswers } from "@/lib/data/posts";
import { ATTENDANCE, type PostKind } from "@/lib/posts";
import { MEMBER_PARTS } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";
import { setAttendance } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/posts/[id]">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.posts.title };
}

/** One post: who comes (by part), who has not answered, and attendance on the day. */
export default async function PostAdminPage({ params }: PageProps<"/[lang]/admin/posts/[id]">) {
  const locale = await resolveLocale(params);
  await requireRole(locale, ["activity_manager"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const dict = getDictionary(locale);
  const t = dict.admin.posts;
  const n = (v: number) => formatNumber(locale, v);

  const supabase = await createClient();
  const { data: post } = await supabase.from("events").select("id, kind, title, description, venue, starts_at, status").eq("id", id).maybeSingle();
  if (!post) notFound();
  const [members, { data: marks }] = await Promise.all([
    getActiveMembers(),
    supabase.from("event_attendance").select("user_id, status").eq("event_id", id),
  ]);
  const { answers, tallies } = await tallyAnswers([id], members);
  const answerOf = answers.get(id) ?? new Map();
  const tally = tallies.get(id)!;
  const markOf = new Map((marks ?? []).map((m) => [m.user_id, m.status]));
  const order = (part: string | null) => (part ? MEMBER_PARTS.indexOf(part as (typeof MEMBER_PARTS)[number]) : 9);
  const sorted = [...members].sort((a, b) => order(a.part) - order(b.part) || a.name.localeCompare(b.name));
  const chip = { yes: "chip chip-teal", maybe: "chip", no: "chip bg-rose/15! text-rose!" } as const;
  const cell = "border-b border-white/6 px-2 py-3";

  return (
    <>
      <nav aria-label={dict.academy.breadcrumb} className="flex gap-2 text-sm text-muted">
        <Link href={`/${locale}/admin/posts`}>{t.back}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{post.title}</span>
      </nav>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{t.kinds[post.kind as PostKind] ?? post.kind}</span>
          {post.status === "cancelled" && <span className="chip bg-rose/15! text-rose!">{t.cancelled}</span>}
        </div>
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{post.title}</h1>
        <p className="m-0 text-muted">{formatDate(locale, post.starts_at, { weekday: "long" })} · {formatTime(locale, post.starts_at)}{post.venue ? ` · ${post.venue}` : ""}</p>
        {post.description && <p className="m-0 max-w-[720px] leading-[1.8] whitespace-pre-line text-soft">{post.description}</p>}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
        {[[t.yes, tally.yes, "text-teal-light"], [t.no, tally.no, "text-rose"], [t.noAnswer, tally.none, "text-muted"]].map(([label, value, tone]) => (
          <div key={label as string} className="card flex flex-col gap-1 rounded-[20px] p-5">
            <span className="text-sm text-muted">{label}</span>
            <span className={`font-display text-[34px] font-semibold ${tone}`}>{n(value as number)}</span>
          </div>
        ))}
        {MEMBER_PARTS.map((part) => (
          <div key={part} className="card flex flex-col gap-1 rounded-[20px] p-5">
            <span className="text-sm text-muted">{t.yes} · {dict.parts[part]}</span>
            <span className="font-display text-[34px] font-semibold text-gold">{n(tally.yesByPart[part])}</span>
          </div>
        ))}
      </div>

      <section aria-labelledby="att-h" className="card flex flex-col gap-3 p-6">
        <h2 id="att-h" className="m-0 font-display text-[22px] font-semibold">{t.attendance}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[15px]">
            <thead>
              <tr className="text-[13px] text-muted">
                {[t.member, dict.admin.members.part, t.response, t.attendance].map((h) => (
                  <th key={h} scope="col" className="border-b border-white/10 px-2 py-3 text-start font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const r = answerOf.get(m.id) as keyof typeof chip | undefined;
                return (
                  <tr key={m.id}>
                    <td className={`${cell} font-medium`}>{m.name}</td>
                    <td className={`${cell} text-soft`}>{m.part ? dict.parts[m.part] : "—"}{m.instruments.length ? ` · ${m.instruments.join("، ")}` : ""}</td>
                    <td className={cell}>{r ? <span className={chip[r]}>{t[r]}</span> : <span className="text-muted">{t.noAnswer}</span>}</td>
                    <td className="border-b border-white/6 p-2">
                      <form action={setAttendance} className="flex items-center gap-1.5">
                        <input type="hidden" name="event" value={id} />
                        <input type="hidden" name="user" value={m.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <label htmlFor={`att-${m.id}`} className="sr-only">{t.attendance}: {m.name}</label>
                        <select id={`att-${m.id}`} name="status" defaultValue={markOf.get(m.id) ?? ""} className="field min-h-10! py-1.5 text-sm">
                          <option value="" disabled>{t.notMarked}</option>
                          {ATTENDANCE.map((a) => <option key={a} value={a}>{t.attendanceStatus[a]}</option>)}
                        </select>
                        <button type="submit" className="btn-ghost min-h-10! px-3! text-sm">{t.save}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
