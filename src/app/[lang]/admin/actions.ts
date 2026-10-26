"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { MEMBER_PARTS, type MemberPart } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const refresh = (locale: string) => {
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/members`);
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

/** Suspends a member (they keep their history but lose access) or reactivates them. */
export async function setMemberStatus(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id) || id === viewer.id || (status !== "active" && status !== "suspended")) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ status }).eq("id", id);
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
