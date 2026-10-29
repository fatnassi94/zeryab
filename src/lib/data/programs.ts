import "server-only";
import { cache } from "react";
import { applyEdits, type Edits } from "@/lib/program-edits";
import { getProgram, PROGRAMS } from "@/lib/programs";
import { createClient } from "@/lib/supabase/server";

/** Back-office edits of every program (empty when none, or when the table is not there yet). */
export const getProgramEdits = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("program_edits").select("slug, edits, updated_at");
  return new Map((data ?? []).map((r) => [r.slug, { edits: (r.edits ?? {}) as Edits, updatedAt: r.updated_at }]));
});

/** A program as shown on its page: the written version with the back office's edits applied. */
export async function loadProgram(slug: string) {
  const base = getProgram(slug);
  if (!base) return null;
  const row = (await getProgramEdits()).get(slug);
  return row ? applyEdits(base, row.edits) : base;
}

export async function loadPrograms() {
  const edits = await getProgramEdits();
  return PROGRAMS.map((p) => {
    const row = edits.get(p.slug);
    return row ? applyEdits(p, row.edits) : p;
  });
}
