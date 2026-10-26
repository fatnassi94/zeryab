"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { ATTENDANCE, POST_KINDS, REPEAT_WEEKS, type Attendance, type PostKind } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PostField = "kind" | "title" | "message" | "date" | "time" | "venue" | "repeat";
export type PostState = { status: "idle" | "sent" | "error" | "fields"; errors?: Partial<Record<PostField, true>> };

const refresh = (locale: string) => {
  revalidatePath(`/${locale}/admin/posts`, "layout");
  revalidatePath(`/${locale}/members`);
};

/** A post for the members (rehearsal, meeting…): they answer whether they will come. */
export async function createPost(_prev: PostState, formData: FormData): Promise<PostState> {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return { status: "error" };
  const field = (k: string) => String(formData.get(k) ?? "").trim();
  const locale = field("locale") || "ar";
  const kind = field("kind");
  const title = field("title");
  const message = field("message");
  const date = field("date");
  const time = field("time");
  const venue = field("venue");
  const weeks = Number(field("repeat") || "1");

  const errors: Partial<Record<PostField, true>> = {};
  if (!(POST_KINDS as readonly string[]).includes(kind)) errors.kind = true;
  if (title.length < 3 || title.length > 140) errors.title = true;
  if (message.length > 2000) errors.message = true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = true;
  if (!/^\d{2}:\d{2}$/.test(time)) errors.time = true;
  if (venue.length > 140) errors.venue = true;
  if (!(REPEAT_WEEKS as readonly number[]).includes(weeks)) errors.repeat = true;
  // Club time is Tunis time (UTC+1 all year).
  const startsAt = new Date(`${date}T${time}:00+01:00`);
  if (!errors.date && !errors.time && Number.isNaN(startsAt.getTime())) errors.date = true;
  if (Object.keys(errors).length) return { status: "fields", errors };

  const supabase = await createClient();
  // A weekly rehearsal: one post per week, same day and time (Tunis has no daylight saving).
  const rows = Array.from({ length: weeks }, (_, i) => ({
    kind: kind as PostKind,
    title,
    description: message || null,
    venue: venue || null,
    starts_at: new Date(startsAt.getTime() + i * 7 * 24 * 3600 * 1000).toISOString(),
    visibility: "members" as const,
    status: "published" as const,
    created_by: viewer.id,
  }));
  const { error } = await supabase.from("events").insert(rows);
  if (error) {
    console.error("[posts] create failed:", error.message);
    return { status: "error" };
  }
  refresh(locale);
  return { status: "sent" };
}

/** Cancels a post: it stays in the history, marked cancelled, and members see it. */
export async function cancelPost(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return;
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("events").update({ status: "cancelled" }).eq("id", id);
  refresh(locale);
}

/** Records whether a member came to a rehearsal. */
export async function setAttendance(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return;
  const eventId = String(formData.get("event") ?? "");
  const userId = String(formData.get("user") ?? "");
  const status = String(formData.get("status") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(eventId) || !UUID.test(userId) || !(ATTENDANCE as readonly string[]).includes(status)) return;
  const supabase = await createClient();
  await supabase.from("event_attendance").upsert(
    { event_id: eventId, user_id: userId, status: status as Attendance, recorded_by: viewer.id, recorded_at: new Date().toISOString() },
    { onConflict: "event_id,user_id" },
  );
  revalidatePath(`/${locale}/admin/posts/${eventId}`);
}
