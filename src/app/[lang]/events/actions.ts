"use server";

import { createClient } from "@/lib/supabase/server";

export type BookingState = { status: "idle" | "sent" | "error" | "closed" };

export async function bookSeats(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const eventId = String(formData.get("event_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const seats = Number(formData.get("seats") ?? 1);

  if (!eventId || !fullName || !/^\S+@\S+\.\S+$/.test(email) || !Number.isInteger(seats) || seats < 1 || seats > 10) {
    return { status: "error" };
  }

  const supabase = await createClient();
  // No .select(): visitors may create a booking but not read bookings back (RLS).
  const { error } = await supabase
    .from("bookings")
    .insert({ event_id: eventId, full_name: fullName, email, phone, note, seats });

  if (error) return { status: error.code === "42501" ? "closed" : "error" };
  return { status: "sent" };
}
