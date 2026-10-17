"use server";

import { createClient } from "@/lib/supabase/server";

export type BookingValues = { full_name: string; email: string; phone: string; seats: string; note: string };
/** `values` echoes the submission so the form can refill itself after an error. */
export type BookingState = { status: "idle" | "sent" | "error" | "closed"; values?: BookingValues };

export async function bookSeats(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const eventId = String(formData.get("event_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const seats = Number(formData.get("seats") ?? 1);
  const values: BookingValues = { full_name: fullName, email, phone: phone ?? "", seats: String(formData.get("seats") ?? "1"), note: note ?? "" };

  if (!eventId || !fullName || !/^\S+@\S+\.\S+$/.test(email) || !Number.isInteger(seats) || seats < 1 || seats > 10) {
    return { status: "error", values };
  }

  const supabase = await createClient();
  // No .select(): visitors may create a booking but not read bookings back (RLS).
  const { error } = await supabase
    .from("bookings")
    .insert({ event_id: eventId, full_name: fullName, email, phone, note, seats });

  if (error) return { status: error.code === "42501" ? "closed" : "error", values };
  return { status: "sent" };
}
