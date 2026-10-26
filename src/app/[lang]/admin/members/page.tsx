import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { hasLocale } from "@/i18n/config";
import { fill, formatDate, formatNumber, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { MEMBER_PARTS, type MemberPart } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";
import { approveRequest, rejectRequest, setMemberPart, setMemberStatus } from "../actions";

const STATUSES = ["pending", "active", "suspended", "inactive"] as const;
type Status = (typeof STATUSES)[number];

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/members">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.members.title };
}

/** Members back office: requests to approve, then every member filtered by part and status. */
export default async function MembersAdminPage({ params, searchParams }: PageProps<"/[lang]/admin/members">) {
  const locale = await resolveLocale(params);
  const viewer = await requireRole(locale, ["admin"]);
  const dict = getDictionary(locale);
  const a = dict.admin;
  const m = a.members;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const part = (MEMBER_PARTS as readonly string[]).includes(one(sp.part)) ? (one(sp.part) as MemberPart) : null;
  const status = (STATUSES as readonly string[]).includes(one(sp.status)) ? (one(sp.status) as Status) : null;
  const q = one(sp.q).trim().slice(0, 80);
  const base = `/${locale}/admin/members`;
  const n = (v: number) => formatNumber(locale, v);

  const supabase = await createClient();
  let list = supabase.from("profiles").select("id, full_name, part, instruments, status, joined_at, created_at").order("full_name");
  if (part) list = list.eq("part", part);
  if (status) list = list.eq("status", status);
  if (q) list = list.ilike("full_name", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const [{ data: requests }, { data: members }, { data: activeParts }] = await Promise.all([
    supabase.from("membership_requests").select("id, full_name, email, part, instruments, message, created_at").eq("status", "pending").order("created_at"),
    list.limit(500),
    supabase.from("profiles").select("part").eq("status", "active"),
  ]);
  const ids = (members ?? []).map((p) => p.id);
  // Attendance so far: present (or late) out of the rehearsals where the member was marked.
  const { data: marks } = ids.length ? await supabase.from("event_attendance").select("user_id, status").in("user_id", ids) : { data: [] };
  const attendance = new Map<string, { came: number; marked: number }>();
  for (const r of marks ?? []) {
    const a = attendance.get(r.user_id) ?? { came: 0, marked: 0 };
    a.marked++;
    if (r.status === "present" || r.status === "late") a.came++;
    attendance.set(r.user_id, a);
  }
  const { data: emails } = ids.length ? await supabase.from("profile_private").select("id, email").in("id", ids) : { data: [] };
  const emailOf = new Map((emails ?? []).map((e) => [e.id, e.email]));
  const byPart = new Map<string, number>();
  for (const r of activeParts ?? []) byPart.set(r.part ?? "none", (byPart.get(r.part ?? "none") ?? 0) + 1);

  const filterHref = (next: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { part, status, q: q || null, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const partLabel = (p: string | null) => (p ? dict.parts[p as MemberPart] : m.noPart);
  const statusChip: Record<Status, string> = { pending: "chip", active: "chip chip-teal", suspended: "chip bg-rose/15! text-rose!", inactive: "chip bg-white/8! text-muted!" };
  const cell = "border-b border-white/6 px-2 py-3";

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{m.title}</h1>
        <p className="m-0 text-muted">{m.intro}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3">
        {MEMBER_PARTS.map((p) => (
          <Link key={p} href={filterHref({ part: part === p ? null : p, status: "active" })}
            className={`card flex flex-col gap-1 rounded-[20px] p-5 text-text no-underline hover:text-text ${part === p ? "border-gold/60!" : ""}`}>
            <span className="text-sm text-muted">{dict.parts[p]}</span>
            <span className="font-display text-[34px] font-semibold text-gold">{n(byPart.get(p) ?? 0)}</span>
            <span className="text-[13px] text-muted">{m.activeMembers}</span>
          </Link>
        ))}
      </div>

      <section id="requests" aria-labelledby="req-h" className="card flex flex-col gap-3 p-6">
        <h2 id="req-h" className="m-0 font-display text-[22px] font-semibold">{a.requests.title}</h2>
        {!requests?.length ? (
          <EmptyState title={a.requests.none} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[15px]">
              <thead>
                <tr className="text-[13px] text-muted">
                  {[a.requests.name, m.part, a.requests.date, a.requests.action].map((h) => (
                    <th key={h} scope="col" className="border-b border-white/10 px-2 py-3 text-start font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className={cell}>
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-[13px] text-muted" dir="ltr">{r.email}</div>
                    </td>
                    <td className={`${cell} text-soft`}>{partLabel(r.part)}{r.instruments.length ? ` · ${r.instruments.join("، ")}` : ""}</td>
                    <td className={`${cell} text-muted`}>{formatDate(locale, r.created_at)}</td>
                    <td className="border-b border-white/6 p-2">
                      <div className="flex gap-1.5">
                        <form action={approveRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button type="submit" className="btn-gold min-h-10! px-4!">{a.requests.approve}</button>
                        </form>
                        <form action={rejectRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button type="submit" className="btn-ghost min-h-10! px-4!">{a.requests.reject}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="list-h" className="card flex flex-col gap-4 p-6">
        <h2 id="list-h" className="m-0 font-display text-[22px] font-semibold">{m.listTitle}</h2>
        <form method="get" className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-q" className="label">{m.search}</label>
            <input id="f-q" name="q" defaultValue={q} className="field" maxLength={80} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-part" className="label">{m.part}</label>
            <select id="f-part" name="part" defaultValue={part ?? ""} className="field">
              <option value="">{m.all}</option>
              {MEMBER_PARTS.map((p) => <option key={p} value={p}>{dict.parts[p]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-status" className="label">{m.status}</label>
            <select id="f-status" name="status" defaultValue={status ?? ""} className="field">
              <option value="">{m.all}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{a.statuses[s]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold">{m.filter}</button>
            {(part || status || q) && <Link href={base} className="btn-ghost">{m.clear}</Link>}
          </div>
        </form>
        <p className="m-0 text-sm text-muted" aria-live="polite">{fill(m.count, { n: n(members?.length ?? 0) })}</p>

        {!members?.length ? (
          <EmptyState title={m.none} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[15px]">
              <thead>
                <tr className="text-[13px] text-muted">
                  {[a.requests.name, m.part, m.status, m.attendance, m.joined, a.requests.action].map((h) => (
                    <th key={h} scope="col" className="border-b border-white/10 px-2 py-3 text-start font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((p) => (
                  <tr key={p.id}>
                    <td className={cell}>
                      <div className="font-medium">{p.full_name || "—"}{p.id === viewer.id && <span className="ms-2 text-[13px] text-gold">{m.you}</span>}</div>
                      <div className="text-[13px] text-muted" dir="ltr">{emailOf.get(p.id) ?? ""}</div>
                    </td>
                    <td className={cell}>
                      <form action={setMemberPart} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <label htmlFor={`part-${p.id}`} className="sr-only">{m.part}</label>
                        <select id={`part-${p.id}`} name="part" defaultValue={p.part ?? ""} className="field min-h-10! py-1.5 text-sm">
                          <option value="" disabled>{m.noPart}</option>
                          {MEMBER_PARTS.map((x) => <option key={x} value={x}>{dict.parts[x]}</option>)}
                        </select>
                        <button type="submit" className="btn-ghost min-h-10! px-3! text-sm">{m.save}</button>
                      </form>
                      {p.instruments.length > 0 && <div className="mt-1 text-[13px] text-muted">{p.instruments.join("، ")}</div>}
                    </td>
                    <td className={cell}><span className={statusChip[p.status as Status]}>{a.statuses[p.status as Status]}</span></td>
                    <td className={`${cell} tabular-nums`}>
                      {(() => {
                        const at = attendance.get(p.id);
                        return at ? fill(m.attendanceOf, { came: n(at.came), marked: n(at.marked) }) : <span className="text-muted">—</span>;
                      })()}
                    </td>
                    <td className={`${cell} text-muted`}>{p.joined_at ? formatDate(locale, p.joined_at) : "—"}</td>
                    <td className="border-b border-white/6 p-2">
                      {p.id !== viewer.id && (p.status === "active" || p.status === "suspended") && (
                        <form action={setMemberStatus}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="status" value={p.status === "active" ? "suspended" : "active"} />
                          <button type="submit" className="btn-ghost min-h-10! px-4! text-sm">{p.status === "active" ? m.suspend : m.reactivate}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
