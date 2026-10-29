"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookings";
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

/** Confirms a booking, moves it to the waiting list, cancels it or restores it. */
export async function setBookingStatus(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return;
  const id = String(formData.get("id") ?? "");
  const show = String(formData.get("show") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  const locale = String(formData.get("locale") ?? "ar");
  if (!UUID.test(id) || !UUID.test(show) || !BOOKING_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from("bookings").update({ status }).eq("id", id).eq("event_id", show);
  refresh(locale, show);
}

export type AddBookingState = { status: "idle" | "added" | "error" | "fields"; errors?: Partial<Record<"name" | "email" | "phone" | "seats", true>> };

/** A booking taken by phone or at the door, added by hand. */
export async function addBooking(_prev: AddBookingState, formData: FormData): Promise<AddBookingState> {
  const viewer = await getViewer();
  if (!viewer?.has("activity_manager")) return { status: "error" };
  const f = (k: string) => String(formData.get(k) ?? "").trim();
  const show = f("show");
  const locale = f("locale") || "ar";
  const name = f("name");
  const email = f("email");
  const phone = f("phone");
  const note = f("note");
  const seats = Number(f("seats") || "1");
  const status = f("status") === "waitlist" ? "waitlist" : "confirmed";
  if (!UUID.test(show)) return { status: "error" };

  const errors: AddBookingState["errors"] = {};
  if (name.length < 2 || name.length > 120) errors.name = true;
  if (email && (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200)) errors.email = true;
  if (phone.length > 40) errors.phone = true;
  if (!Number.isInteger(seats) || seats < 1 || seats > 10) errors.seats = true;
  if (Object.keys(errors).length) return { status: "fields", errors };

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").insert({
    event_id: show, full_name: name, email, phone: phone || null, note: note.slice(0, 500) || null, seats, status,
  });
  if (error) {
    console.error("[bookings] add failed:", error.message);
    return { status: "error" };
  }
  refresh(locale, show);
  return { status: "added" };
}
