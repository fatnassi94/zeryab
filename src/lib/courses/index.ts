import { READING_NOTES } from "./reading-notes";
import { RHYTHMS } from "./rhythms";
import type { Course, CourseItem } from "./types";

export type { Block, Course, CourseItem, DrillKind } from "./types";

/** Courses whose content is written in code (the database keeps their rows for access and progress). */
const COURSES: Course[] = [READING_NOTES, RHYTHMS];

/** Slugs of the code-written courses, in the order the admin sees them. */
export const COURSE_SLUGS = COURSES.map((c) => c.slug);

export const getCourseContent = (slug: string) => COURSES.find((c) => c.slug === slug) ?? null;

export const getCourseItem = (course: Course | null, slug: string): CourseItem | null => course?.items.find((i) => i.slug === slug) ?? null;

export { DRILL_LENGTH, DRILL_PASS, TEST_PASS } from "./rules";
