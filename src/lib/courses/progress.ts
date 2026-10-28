import { TEST_PASS } from "./rules";
import type { Course } from "./types";

/**
 * Learner level in a course, from the items they completed and their best
 * final-test score:
 * 0 not started · 1 learning the basics · 2 basics done (every lesson)
 * · 3 drills done (every lesson and drill) · 4 passed the final test.
 */
export type Level = 0 | 1 | 2 | 3 | 4;

export type CourseProgress = {
  done: number;
  total: number;
  percent: number;
  lessons: { done: number; total: number };
  drills: { done: number; total: number };
  /** Best final-test result as a percentage, or null if never taken. */
  testPercent: number | null;
  testPassed: boolean;
  level: Level;
  /** First item not done yet, in course order (where "continue" leads). */
  next: string | null;
  /** Slugs of the items done (the final test counts once passed). */
  completed: string[];
};

export function courseProgress(course: Course, completed: ReadonlySet<string>, bestTest: { score: number; max: number } | null): CourseProgress {
  const count = (kind: string) => {
    const items = course.items.filter((i) => i.kind === kind);
    return { done: items.filter((i) => completed.has(i.slug)).length, total: items.length };
  };
  const lessons = count("lesson");
  const drills = count("drill");
  const testPercent = bestTest && bestTest.max > 0 ? Math.round((bestTest.score / bestTest.max) * 100) : null;
  const testPassed = testPercent !== null && testPercent >= TEST_PASS * 100;
  const done = course.items.filter((i) => completed.has(i.slug) || (i.kind === "test" && testPassed)).length;
  const total = course.items.length;
  const level: Level =
    testPassed ? 4
    : lessons.done === lessons.total && drills.done === drills.total ? 3
    : lessons.done === lessons.total ? 2
    : done > 0 ? 1
    : 0;
  const next = course.items.find((i) => !completed.has(i.slug) && !(i.kind === "test" && testPassed))?.slug ?? null;
  const completedList = course.items.filter((i) => completed.has(i.slug) || (i.kind === "test" && testPassed)).map((i) => i.slug);
  return { completed: completedList, done, total, percent: total ? Math.round((done / total) * 100) : 0, lessons, drills, testPercent, testPassed, level, next };
}
