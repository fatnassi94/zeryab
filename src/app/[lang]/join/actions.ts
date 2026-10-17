"use server";

import { revalidatePath } from "next/cache";
import { hasLocale } from "@/i18n/config";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type JoinState = { status: "idle" | "sent" | "error" };

export async function applyForMembership(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const viewer = await getViewer();
  if (!viewer?.email) return { status: "error" };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { status: "error" };
  const l = String(formData.get("locale") ?? "ar");
  const instruments = String(formData.get("instruments") ?? "")
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  const supabase = await createClient();
  const { error } = await supabase.from("membership_requests").insert({
    user_id: viewer.id,
    email: viewer.email,
    full_name: fullName,
    phone: String(formData.get("phone") ?? "").trim() || null,
    instruments,
    experience: String(formData.get("experience") ?? "").trim() || null,
    message: String(formData.get("message") ?? "").trim() || null,
    preferred_locale: hasLocale(l) ? l : "ar",
  });
  if (error) return { status: "error" };

  // Keep the name on the profile in sync with what was submitted.
  await supabase.from("profiles").update({ full_name: fullName, instruments }).eq("id", viewer.id);
  revalidatePath(`/${l}/join`);
  return { status: "sent" };
}
