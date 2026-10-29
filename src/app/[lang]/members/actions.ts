"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { checkProfile, passwordError, type ProfileInput } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";

const RESPONSES = ["yes", "maybe", "no"] as const;
type Response = (typeof RESPONSES)[number];

export async function setRsvp(eventId: string, response: Response, locale: string) {
  const viewer = await getViewer();
  if (!viewer?.isActive || !RESPONSES.includes(response)) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_rsvps")
    .upsert({ event_id: eventId, user_id: viewer.id, response }, { onConflict: "event_id,user_id" });

  revalidatePath(`/${locale}/members`);
  return { ok: !error };
}

export type ProfileState = { status: "idle" | "saved" | "error" | "fields"; errors?: Partial<Record<keyof ProfileInput, true>> };

/** The signed-in person's own profile. Email, part and status are not changed here. */
export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error" };
  const f = (k: string) => String(formData.get(k) ?? "");
  const r = checkProfile({ fullName: f("fullName"), displayName: f("displayName"), instruments: f("instruments"), phone: f("phone"), locale: f("locale") });
  if (!r.ok) return { status: "fields", errors: r.errors };
  const { phone, ...profile } = r.value;

  const supabase = await createClient();
  const [a, b] = await Promise.all([
    supabase.from("profiles").update(profile).eq("id", viewer.id),
    // The row is created with the account (sign-up trigger); members may update it, not insert.
    supabase.from("profile_private").update({ phone }).eq("id", viewer.id),
  ]);
  if (a.error || b.error) {
    console.error("[profile] save failed:", a.error?.message ?? b.error?.message);
    return { status: "error" };
  }
  revalidatePath("/[lang]/members", "layout");
  return { status: "saved" };
}

export type PasswordState = { status: "idle" | "saved" | "wrong" | "weak" | "same" | "error" };

/** Changes the password after checking the current one (a borrowed open session is not enough). */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const viewer = await getViewer();
  if (!viewer?.email) return { status: "error" };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (passwordError(next, viewer.email)) return { status: "weak" };
  if (next === current) return { status: "same" };

  const supabase = await createClient();
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: viewer.email, password: current });
  if (wrong) return { status: "wrong" };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { status: "error" };
  return { status: "saved" };
}
