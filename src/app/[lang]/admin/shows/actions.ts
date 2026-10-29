"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { parseShow, type ShowField } from "@/lib/shows";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ShowState = { status: "idle" | "saved" | "error" | "fields"; errors?: Partial<Record<ShowField, true>> };

const refresh = (locale: string, id?: string) => {
  revalidatePath(`/${locale}/admin/shows`, "layout");
  revalidatePath(`/${locale}/events`, "layout");
  revalidatePath(`/${locale}`);
  if (id) revalidatePath(`/${locale}/events/${id}`);
};

/** Creates a public show (then opens it) or saves the changes of an existing one. */
export async function saveShow(_prev: ShowState, formData: FormData): Promise<ShowState> {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return { status: "error" };
  const get = (k: string) => String(formData.get(k) ?? "");
  const locale = get("locale") || "ar";
  const id = get("id");
  if (id && !UUID.test(id)) return { status: "error" };

  const parsed = parseShow(get);
  if ("errors" in parsed) return { status: "fields", errors: parsed.errors };

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("events").update(parsed.row).eq("id", id).eq("visibility", "public");
    if (error) {
      console.error("[shows] update failed:", error.message);
      return { status: "error" };
    }
    refresh(locale, id);
    return { status: "saved" };
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.row, visibility: "public", created_by: viewer.id })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[shows] create failed:", error?.message);
    return { status: "error" };
  }
  refresh(locale);
  redirect(`/${locale}/admin/shows/${data.id}?created=1`);
}

/** Publishes, takes back to draft, cancels or closes a show. A cancelled show stays visible, marked cancelled. */
export async function setShowStatus(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id) || !["draft", "published", "cancelled", "completed"].includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("events")
    .update({ status: status as "draft" | "published" | "cancelled" | "completed" })
    .eq("id", id)
    .eq("visibility", "public");
  refresh(locale, id);
}

/** Deletes a draft that nobody has booked (anything else is cancelled instead, to keep the history). */
export async function deleteShow(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("event_id", id);
  if (count) return;
  await supabase.from("events").delete().eq("id", id).eq("visibility", "public").eq("status", "draft");
  refresh(locale);
  redirect(`/${locale}/admin/shows`);
}
