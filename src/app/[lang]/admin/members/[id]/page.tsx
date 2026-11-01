import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { fill, formatDate, formatNumber, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { COURSE_SLUGS, getCourseContent } from "@/lib/courses";
import { getCourseProgress } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/server";
import { saveMemberRoles, setMemberStatus } from "../../actions";
import { MemberForm, RoleChecks } from "../member-forms";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Props = PageProps<"/[lang]/admin/members/[id]">;
type Status = "pending" | "active" | "suspended" | "inactive";

async function getMember(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, part, instruments, status, joined_at, created_at").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getMember(id))?.full_name };
}

/** One member: details, roles, status (archive instead of delete), attendance and learning. */
export default async function MemberAdminPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const viewer = await requireRole(locale, ["admin"]);
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();
  const dict = getDictionary(locale);
  const a = dict.admin;
  const m = a.members;
  const e = m.edit;
  const self = member.id === viewer.id;
  const status = member.status as Status;
  const n = (v: number) => formatNumber(locale, v);

  const supabase = await createClient();
  const [{ data: priv }, { data: roleRows }, { data: marks }, learning] = await Promise.all([
    supabase.from("profile_private").select("email, phone, admin_notes").eq("id", member.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", member.id),
    supabase.from("event_attendance").select("status").eq("user_id", member.id),
    Promise.all(COURSE_SLUGS.map(async (slug) => ({ title: getCourseContent(slug)!.title, pr: (await getCourseProgress(slug, [member.id])).byUser.get(member.id) }))),
  ]);
  const roles = (roleRows ?? []).map((r) => r.role);
  const came = (marks ?? []).filter((x) => x.status === "present" || x.status === "late").length;
  const options = { parts: dict.parts, noPart: m.noPart, roles: dict.roles };

  const statusButton = (to: Status, label: string, confirmText?: string) => (
    <form action={setMemberStatus}>
      <input type="hidden" name="id" value={member.id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="status" value={to} />
      {confirmText
        ? <ConfirmButton message={confirmText} className="btn-ghost min-h-10! px-4! text-sm">{label}</ConfirmButton>
        : <button type="submit" className="btn-ghost min-h-10! px-4! text-sm">{label}</button>}
    </form>
  );

  return (
    <>
      <Link href={`/${locale}/admin/members`} className="text-sm">{e.back}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{member.full_name || "—"}</h1>
        <span className="chip">{a.statuses[status]}</span>
        {self && <span className="text-sm text-gold">{m.you}</span>}
      </div>

      <section aria-label={e.summary} className="card grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-4 p-6">
        {[
          [dict.account.email, priv?.email ?? "—"],
          [m.joined, member.joined_at ? formatDate(locale, member.joined_at, { year: "numeric" }) : "—"],
          [m.attendance, marks?.length ? fill(m.attendanceOf, { came: n(came), marked: n(marks.length) }) : "—"],
          ...learning.filter((l) => l.pr && l.pr.done > 0).map((l) => [l.title, `${dict.academy.learn.levels[l.pr!.level]} · ${n(l.pr!.percent)}%`]),
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">{label}</span>
            <span className="font-medium" dir={label === dict.account.email ? "ltr" : undefined}>{value}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="details-h" className="card flex flex-col gap-5 p-6 sm:p-8">
        <h2 id="details-h" className="m-0 font-display text-[22px] font-semibold">{e.details}</h2>
        <MemberForm
          locale={locale}
          id={member.id}
          labels={e.form}
          options={options}
          values={{
            name: member.full_name, part: member.part ?? "", instruments: member.instruments.join("، "),
            phone: priv?.phone ?? "", notes: priv?.admin_notes ?? "",
          }}
        />
      </section>

      <section aria-labelledby="roles-h" className="card flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 id="roles-h" className="m-0 font-display text-[22px] font-semibold">{e.roles}</h2>
          <p className="m-0 text-sm text-muted">{e.rolesHint}</p>
        </div>
        <form action={saveMemberRoles} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={member.id} />
          <input type="hidden" name="locale" value={locale} />
          <RoleChecks picked={roles} labels={dict.roles} legend={e.roles} lockAdmin={self} />
          <button type="submit" className="btn-gold self-start">{e.saveRoles}</button>
        </form>
      </section>

      {!self && (
        <section aria-labelledby="status-h" className="card flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 id="status-h" className="m-0 font-display text-[22px] font-semibold">{e.statusTitle}</h2>
            <p className="m-0 text-sm text-muted">{e.statusHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status !== "active" && statusButton("active", status === "pending" ? e.activate : m.reactivate)}
            {status === "active" && statusButton("suspended", m.suspend)}
            {status !== "inactive" && statusButton("inactive", e.archive, e.archiveConfirm)}
          </div>
        </section>
      )}
    </>
  );
}
