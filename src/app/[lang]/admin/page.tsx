import type { Metadata } from "next";
import Link from "next/link";
import { hasLocale } from "@/i18n/config";
import { fill, formatDate, formatNumber, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approveRequest, rejectRequest } from "./actions";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata({ params }: PageProps<"/[lang]/admin">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.title };
}

export default async function AdminPage({ params }: PageProps<"/[lang]/admin">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const a = dict.admin;
  const viewer = await requireRole(locale, ["teacher", "activity_manager", "librarian", "admin"]);
  const supabase = await createClient();
  const n = (v: number) => formatNumber(locale, v);

  const [accounts, active, pendingCount, recordings, publicRecordings, nextEventRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("membership_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("recordings").select("id", { count: "exact", head: true }),
    supabase.from("recordings").select("id", { count: "exact", head: true }).eq("visibility", "public").eq("status", "published"),
    supabase
      .from("events")
      .select("id, title, capacity")
      .eq("status", "published")
      .eq("is_bookable", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const nextEvent = nextEventRes.data;
  let booked = 0;
  if (nextEvent) {
    const { data } = await supabase.from("bookings").select("seats").eq("event_id", nextEvent.id).eq("status", "confirmed");
    booked = (data ?? []).reduce((sum, b) => sum + b.seats, 0);
  }

  const stats = [
    { label: a.stats.active, value: n(active.count ?? 0), sub: fill(a.stats.ofAccounts, { n: n(accounts.count ?? 0) }) },
    { label: a.stats.requests, value: n(pendingCount.count ?? 0), sub: a.stats.pending },
    {
      label: a.stats.bookings,
      value: nextEvent ? n(booked) : "—",
      sub: nextEvent ? (nextEvent.capacity ? fill(a.stats.ofSeats, { n: n(nextEvent.capacity) }) : nextEvent.title) : a.stats.noEvent,
    },
    { label: a.stats.recordings, value: n(recordings.count ?? 0), sub: fill(a.stats.publicCount, { n: n(publicRecordings.count ?? 0) }) },
  ];

  const [requestsRes, logRes] = viewer.isAdmin
    ? await Promise.all([
        supabase
          .from("membership_requests")
          .select("id, full_name, email, instruments, message, created_at, user_id")
          .eq("status", "pending")
          .order("created_at"),
        supabase.from("audit_log").select("id, actor_id, action, entity_type, details, created_at").order("created_at", { ascending: false }).limit(8),
      ])
    : [{ data: [] }, { data: [] }];
  const requests = requestsRes.data ?? [];
  const log = logRes.data ?? [];

  const actorIds = [...new Set(log.map((l) => l.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const actorName = new Map((actors ?? []).map((p) => [p.id, p.full_name]));

  const describe = (entry: (typeof log)[number]) => {
    const d = (entry.details ?? {}) as Record<string, string>;
    const statusLabel = (s: string) => a.statuses[s as keyof typeof a.statuses] ?? s;
    switch (entry.action) {
      case "role_granted":
      case "role_revoked":
        return fill(a.log.actions[entry.action], { role: dict.roles[d.role as keyof typeof dict.roles] ?? d.role });
      case "member_status_changed":
        return fill(a.log.actions.member_status_changed, { from: statusLabel(d.from), to: statusLabel(d.to) });
      case "deleted":
        return fill(a.log.actions.deleted, { table: entry.entity_type });
      default:
        return entry.action;
    }
  };

  return (
    <>
      <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{a.overview}</h1>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex flex-col gap-2 rounded-[22px] p-[22px]">
            <span className="text-sm text-muted">{s.label}</span>
            <span className="font-display text-[38px] font-semibold text-gold">{s.value}</span>
            <span className="text-[13px] text-muted">{s.sub}</span>
          </div>
        ))}
      </div>

      {viewer.isAdmin && (
        <section id="requests" aria-labelledby="req-h" className="card flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="req-h" className="m-0 font-display text-[22px] font-semibold">{a.requests.title}</h2>
            <Link href={`/${locale}/admin/members`} className="text-sm">{a.members.title}</Link>
          </div>
          {requests.length === 0 ? (
            <EmptyState title={a.requests.none} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[15px]">
                <thead>
                  <tr className="text-[13px] text-muted">
                    {[a.requests.name, a.requests.instrument, a.requests.message, a.requests.date, a.requests.action].map((h) => (
                      <th key={h} scope="col" className="border-b border-white/10 px-2 py-3 text-start font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="border-b border-white/6 px-2 py-3.5">
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-[13px] text-muted" dir="ltr">{r.email}{r.user_id ? "" : ` · ${a.requests.noAccount}`}</div>
                      </td>
                      <td className="border-b border-white/6 px-2 py-3.5 text-soft">{r.instruments.join("، ") || "—"}</td>
                      <td className="max-w-[260px] border-b border-white/6 px-2 py-3.5 text-soft">{r.message || "—"}</td>
                      <td className="border-b border-white/6 px-2 py-3.5 text-muted">{formatDate(locale, r.created_at)}</td>
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
      )}

      {viewer.isAdmin && (
        <section id="log" aria-labelledby="log-h" className="card flex flex-col gap-1 p-6">
          <h2 id="log-h" className="m-0 mb-2 font-display text-[22px] font-semibold">{a.log.title}</h2>
          {log.length === 0 && <EmptyState title={a.log.none} />}
          {log.map((entry, i) => (
            <div key={entry.id} className="flex items-start gap-3.5 border-t border-white/7 py-3.5">
              <span
                aria-hidden="true"
                className={`mt-2 size-2.5 flex-none rounded-full ${
                  i % 2 ? "dot-teal" : "dot-gold"
                }`}
              />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px]">{describe(entry)}</span>
                <span className="text-[13px] text-muted">
                  {(entry.actor_id && actorName.get(entry.actor_id)) || a.log.system} · {formatDate(locale, entry.created_at)} {formatTime(locale, entry.created_at)}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
