"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { applyEdit, valueAt, type EditError, type Edits, type EditValue } from "@/lib/program-edits";
import { getProgram } from "@/lib/programs";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true } | { ok: false; error: "forbidden" | "save" | "invalid"; fields?: Record<string, EditError> };

const refresh = () => {
  revalidatePath("/[lang]/library", "layout");
  revalidatePath("/[lang]/admin/archive", "page");
};

/** Saves the changes made on a program page (the Save button): all of them, or none if one is refused. */
export async function saveProgramEdits(slug: string, changes: Record<string, unknown>): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return { ok: false, error: "forbidden" };
  const base = typeof slug === "string" ? getProgram(slug) : null;
  const entries = changes && typeof changes === "object" ? Object.entries(changes) : [];
  if (!base || !entries.length || entries.length > 300) return { ok: false, error: "invalid" };

  const fields: Record<string, EditError> = {};
  const values: [string, EditValue | undefined][] = [];
  for (const [path, value] of entries) {
    const r = applyEdit(base, path, value);
    if (r.ok) values.push([path, r.value]);
    else fields[path] = r.error;
  }
  if (Object.keys(fields).length) return { ok: false, error: "invalid", fields };

  const supabase = await createClient();
  const { data: row, error: readError } = await supabase.from("program_edits").select("edits").eq("slug", slug).maybeSingle();
  if (readError) return { ok: false, error: "save" };
  const edits: Edits = { ...((row?.edits ?? {}) as Edits) };
  for (const [path, value] of values) {
    // Back to the written value: drop the edit instead of storing a copy.
    if (JSON.stringify(value ?? null) === JSON.stringify(valueAt(base, path) ?? null)) delete edits[path];
    else edits[path] = value ?? "";
  }

  const { error } = await supabase.from("program_edits").upsert({ slug, edits, updated_by: viewer.id });
  if (error) return { ok: false, error: "save" };
  refresh();
  return { ok: true };
}

/** Drops every edit of a program: the page shows the written version again. */
export async function resetProgram(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.has("librarian")) return;
  const slug = String(formData.get("slug") ?? "");
  if (!getProgram(slug)) return;
  const supabase = await createClient();
  await supabase.from("program_edits").delete().eq("slug", slug);
  refresh();
}
