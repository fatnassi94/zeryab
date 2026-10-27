import "server-only";
import type { MemberPart } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";

export type Answer = "yes" | "maybe" | "no";
export type ActiveMember = { id: string; name: string; part: MemberPart | null; instruments: string[] };
export type PostRow = {
  id: string; kind: string; title: string; description: string | null; venue: string | null;
  starts_at: string; status: string;
};
export type Tally = { yes: number; maybe: number; no: number; none: number; yesByPart: Record<MemberPart | "none", number> };

const emptyByPart = (): Tally["yesByPart"] => ({ lead_vocal: 0, percussion: 0, instrument: 0, none: 0 });

/** Active members (the people a post is addressed to). */
export async function getActiveMembers(): Promise<ActiveMember[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, display_name, part, instruments").eq("status", "active").order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.display_name || p.full_name || "—", part: p.part, instruments: p.instruments }));
}

/** Answers per post, counted against the active members (who has not answered yet, who comes by part). */
export async function tallyAnswers(postIds: string[], members: ActiveMember[]) {
  const answers = new Map<string, Map<string, Answer>>();
  if (postIds.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("event_rsvps").select("event_id, user_id, response").in("event_id", postIds);
    for (const r of data ?? []) {
      if (!answers.has(r.event_id)) answers.set(r.event_id, new Map());
      answers.get(r.event_id)!.set(r.user_id, r.response);
    }
  }
  const tallies = new Map<string, Tally>();
  for (const id of postIds) {
    const t: Tally = { yes: 0, maybe: 0, no: 0, none: 0, yesByPart: emptyByPart() };
    const a = answers.get(id) ?? new Map<string, Answer>();
    for (const m of members) {
      const r = a.get(m.id);
      if (!r) t.none++;
      else {
        t[r]++;
        if (r === "yes") t.yesByPart[m.part ?? "none"]++;
      }
    }
    tallies.set(id, t);
  }
  return { answers, tallies };
}

/** Upcoming member posts the viewer has not answered yet (the notification bell). */
export async function getUnansweredPosts(viewerId: string) {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("events")
    .select("id, kind, title, starts_at, venue")
    .eq("visibility", "members")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(20);
  if (!posts?.length) return [];
  const { data: answered } = await supabase.from("event_rsvps").select("event_id").eq("user_id", viewerId).in("event_id", posts.map((p) => p.id));
  const done = new Set((answered ?? []).map((a) => a.event_id));
  return posts.filter((p) => !done.has(p.id));
}
