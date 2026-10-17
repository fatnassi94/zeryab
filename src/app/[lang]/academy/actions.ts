"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type QuizResult = {
  score: number;
  max_score: number;
  results: { question_id: string; given: number | null; correct_option: number | null; is_correct: boolean; explanation: string | null }[];
};

/** Graded in the database; answer keys never reach the browser before submitting. */
export async function submitQuiz(exerciseId: string, answers: Record<string, number>) {
  const viewer = await getViewer();
  if (!viewer) return { error: "auth" as const };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_exercise_attempt", {
    p_exercise_id: exerciseId,
    p_answers: answers,
  });
  if (error) return { error: "failed" as const };
  return { result: data as unknown as QuizResult };
}

export async function markLessonDone(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) return;
  const lessonId = String(formData.get("lesson_id") ?? "");
  const path = String(formData.get("path") ?? "");
  const supabase = await createClient();
  await supabase
    .from("lesson_progress")
    .upsert(
      { user_id: viewer.id, lesson_id: lessonId, status: "completed", completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
  if (path.startsWith("/")) revalidatePath(path);
}
