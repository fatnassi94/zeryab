"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Approves an application: activates the account and grants the member role. */
export async function approveRequest(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("membership_requests")
    .select("id, user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!request || request.status !== "pending") return;

  if (request.user_id) {
    await supabase
      .from("profiles")
      .update({ status: "active", joined_at: new Date().toISOString().slice(0, 10) })
      .eq("id", request.user_id);
    await supabase
      .from("user_roles")
      .upsert({ user_id: request.user_id, role: "member", granted_by: viewer.id }, { onConflict: "user_id,role", ignoreDuplicates: true });
  }

  await supabase
    .from("membership_requests")
    .update({ status: "approved", reviewed_by: viewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/${locale}/admin`);
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

  revalidatePath(`/${locale}/admin`);
}
