"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { checkInvite, checkMemberEdit, pickRoles, roleChanges } from "@/lib/members";
import { MEMBER_PARTS, type MemberPart } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const refresh = (locale: string) => {
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/members`, "layout");
};

/** Approves an application: activates the account and grants the member role. */
export async function approveRequest(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("membership_requests")
    .select("id, user_id, status, part")
    .eq("id", id)
    .maybeSingle();
  if (!request || request.status !== "pending") return;

  if (request.user_id) {
    await supabase
      .from("profiles")
      .update({ status: "active", joined_at: new Date().toISOString().slice(0, 10), ...(request.part ? { part: request.part } : {}) })
      .eq("id", request.user_id);
    await supabase
      .from("user_roles")
      .upsert({ user_id: request.user_id, role: "member", granted_by: viewer.id }, { onConflict: "user_id,role", ignoreDuplicates: true });
  }

  await supabase
    .from("membership_requests")
    .update({ status: "approved", reviewed_by: viewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  refresh(locale);
}

export async function rejectRequest(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");

  const supabase = await createClient();
  await supabase
    .from("membership_requests")
    .update({ status: "rejected", reviewed_by: viewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");

  refresh(locale);
}

/** Suspends or archives a member (they keep their history but lose access), or reactivates them. */
export async function setMemberStatus(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id) || id === viewer.id || !["active", "suspended", "inactive"].includes(status)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ status: status as "active" | "suspended" | "inactive" }).eq("id", id);
  if (status === "active") {
    await supabase
      .from("user_roles")
      .upsert({ user_id: id, role: "member", granted_by: viewer.id }, { onConflict: "user_id,role", ignoreDuplicates: true });
  }
  refresh(locale);
}

/** Moves a member to another part of the ensemble. */
export async function setMemberPart(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const part = String(formData.get("part") ?? "") as MemberPart;
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id) || !(MEMBER_PARTS as readonly string[]).includes(part)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ part }).eq("id", id);
  refresh(locale);
}

export type InviteState = { status: "idle" | "added" | "exists" | "error" | "fields"; errors?: Partial<Record<"email" | "name" | "part", true>> };

/** Pre-approves someone: when they sign up with this email, their account is active with these roles. */
export async function createInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { status: "error" };
  const locale = String(formData.get("locale") ?? "ar");
  const r = checkInvite({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    part: String(formData.get("part") ?? ""),
    roles: formData.getAll("roles").map(String),
  });
  if (!r.ok) return { status: "fields", errors: r.errors };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("profile_private").select("id").ilike("email", r.value.email).limit(1);
  if (existing?.length) return { status: "exists" };
  const { error } = await supabase.from("member_invites").insert({ ...r.value, invited_by: viewer.id });
  if (error) return { status: error.code === "23505" ? "exists" : "error" };
  refresh(locale);
  return { status: "added" };
}

export async function cancelInvite(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("member_invites").delete().eq("id", id).is("used_at", null);
  refresh(locale);
}

export type MemberState = { status: "idle" | "saved" | "error" | "fields"; errors?: Partial<Record<"name" | "part" | "instruments" | "phone" | "notes", true>> };

/** The admin's edit of a member's details. */
export async function saveMember(_prev: MemberState, formData: FormData): Promise<MemberState> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { status: "error" };
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id)) return { status: "error" };
  const f = (k: string) => String(formData.get(k) ?? "");
  const r = checkMemberEdit({ name: f("name"), part: f("part"), instruments: f("instruments"), phone: f("phone"), notes: f("notes") });
  if (!r.ok) return { status: "fields", errors: r.errors };
  const { phone, admin_notes, ...profile } = r.value;

  const supabase = await createClient();
  const [a, b] = await Promise.all([
    supabase.from("profiles").update(profile).eq("id", id),
    supabase.from("profile_private").update({ phone, admin_notes }).eq("id", id),
  ]);
  if (a.error || b.error) {
    console.error("[members] save failed:", a.error?.message ?? b.error?.message);
    return { status: "error" };
  }
  refresh(locale);
  return { status: "saved" };
}

/** Saves a member's roles (granted and removed roles go to the audit log). */
export async function saveMemberRoles(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", id);
  const { add, remove } = roleChanges((rows ?? []).map((r) => r.role), pickRoles(formData.getAll("roles").map(String)), id === viewer.id);
  if (add.length) await supabase.from("user_roles").insert(add.map((role) => ({ user_id: id, role, granted_by: viewer.id })));
  if (remove.length) await supabase.from("user_roles").delete().eq("user_id", id).in("role", remove);
  refresh(locale);
}
