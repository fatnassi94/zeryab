"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
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
