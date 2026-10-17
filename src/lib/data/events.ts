import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EventRow = {
  id: string;
  slug: string | null;
  kind: "concert" | "rehearsal" | "workshop" | "lesson" | "meeting" | "other";
  title: string;
  summary: string | null;
  description: string | null;
  venue: string | null;
  address: string | null;
  starts_at: string;
  ends_at: string | null;
  visibility: string;
  is_bookable: boolean;
  capacity: number | null;
  price_tnd: number | null;
  status: string;
};

const COLUMNS =
  "id, slug, kind, title, summary, description, venue, address, starts_at, ends_at, visibility, is_bookable, capacity, price_tnd, status";

/** Upcoming published events visible to the current viewer (RLS decides which). */
export async function getUpcomingEvents({ limit = 10, publicOnly = false } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(COLUMNS)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (publicOnly) query = query.eq("visibility", "public");
  const { data } = await query;
  return (data ?? []) as EventRow[];
}

export async function getEvent(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select(COLUMNS).eq("id", id).maybeSingle();
  return data as EventRow | null;
}

export async function getSeatsLeft(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("event_seats_left", { p_event_id: eventId });
  return data as number | null;
}
