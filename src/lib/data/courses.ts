import "server-only";
import { getCourseContent } from "@/lib/courses";
import { courseProgress, type CourseProgress } from "@/lib/courses/progress";
import { createClient } from "@/lib/supabase/server";

/**
 * Progress of some learners in a code-written course: completed lessons
 * (lesson_progress) and best final-test attempt (exercise_attempts). RLS lets a
 * learner read their own rows and admins/course teachers read everyone's.
 */
export async function getCourseProgress(courseSlug: string, userIds: string[]): Promise<{ course: { id: string; title: string } | null; byUser: Map<string, CourseProgress> }> {
  const content = getCourseContent(courseSlug);
  const byUser = new Map<string, CourseProgress>();
  if (!content || !userIds.length) return { course: null, byUser };
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, title, lessons(id, slug, exercises(id))").eq("slug", courseSlug).maybeSingle();
  if (!course) return { course: null, byUser };

  const slugOf = new Map((course.lessons ?? []).map((l) => [l.id, l.slug]));
  const testIds = (course.lessons ?? []).flatMap((l) => (l.exercises ?? []).map((e) => e.id));
  const [{ data: progress }, { data: attempts }] = await Promise.all([
    supabase.from("lesson_progress").select("user_id, lesson_id, status").in("user_id", userIds).in("lesson_id", [...slugOf.keys()]).eq("status", "completed"),
    testIds.length
      ? supabase.from("exercise_attempts").select("user_id, score, max_score").in("user_id", userIds).in("exercise_id", testIds)
      : Promise.resolve({ data: [] as { user_id: string; score: number; max_score: number }[] }),
  ]);

  const done = new Map<string, Set<string>>();
  for (const p of progress ?? []) {
    const slug = slugOf.get(p.lesson_id);
    if (!slug) continue;
    if (!done.has(p.user_id)) done.set(p.user_id, new Set());
    done.get(p.user_id)!.add(slug);
  }
  const best = new Map<string, { score: number; max: number }>();
  for (const a of attempts ?? []) {
    const b = best.get(a.user_id);
    if (a.max_score > 0 && (!b || a.score / a.max_score > b.score / b.max)) best.set(a.user_id, { score: a.score, max: a.max_score });
  }
  for (const id of userIds) byUser.set(id, courseProgress(content, done.get(id) ?? new Set(), best.get(id) ?? null));
  return { course: { id: course.id, title: course.title }, byUser };
}
