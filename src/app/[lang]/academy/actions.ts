"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { TEST_PASS } from "@/lib/courses/rules";
import { createClient } from "@/lib/supabase/server";

export type QuizResult = {
  score: number;
  max_score: number;
  results: { question_id: string; given: number | null; correct_option: number | null; is_correct: boolean; explanation: string | null }[];
};

/** Graded in the database; answer keys never reach the browser before submitting. */
export async function submitQuiz(exerciseId: string, answers: Record<string, number>, path = "") {
  const viewer = await getViewer();
  if (!viewer) return { error: "auth" as const };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_exercise_attempt", {
    p_exercise_id: exerciseId,
    p_answers: answers,
  });
  if (error) return { error: "failed" as const };
  const result = data as unknown as QuizResult;
  // A passed test counts as a completed item of its course.
  if (result.max_score > 0 && result.score / result.max_score >= TEST_PASS) {
    const { data: ex } = await supabase.from("exercises").select("lesson_id").eq("id", exerciseId).maybeSingle();
    if (ex) await saveProgress(ex.lesson_id, true, path);
  }
  return { result };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function saveProgress(lessonId: string, done: boolean, path: string) {
  const viewer = await getViewer();
  if (!viewer || !UUID.test(lessonId)) return false;
  const supabase = await createClient();
  // RLS: own rows only, and only for lessons the viewer may read.
  const { error } = done
    ? await supabase
        .from("lesson_progress")
        .upsert({ user_id: viewer.id, lesson_id: lessonId, status: "completed", completed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" })
    : await supabase.from("lesson_progress").delete().eq("user_id", viewer.id).eq("lesson_id", lessonId);
  if (error) return false;
  if (path.startsWith("/")) {
    revalidatePath(path);
    revalidatePath(path.slice(0, path.lastIndexOf("/")));
  }
  return true;
}

/** "I finished this lesson" button: toggles done / not done, like a course checklist. */
export async function markLessonDone(formData: FormData) {
  await saveProgress(String(formData.get("lesson_id") ?? ""), formData.get("done") !== "0", String(formData.get("path") ?? ""));
}

/** A passed drill marks itself done. */
export async function completeLesson(lessonId: string, path: string) {
  return { ok: await saveProgress(lessonId, true, path) };
}
