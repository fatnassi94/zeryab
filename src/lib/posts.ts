/** Kinds of member posts (they are events shown to members) and attendance marks. */
export const POST_KINDS = ["rehearsal", "meeting", "concert", "workshop", "other"] as const;
export type PostKind = (typeof POST_KINDS)[number];
/** How many weekly occurrences a post can create at once (1 = a single date). */
export const REPEAT_WEEKS = [1, 4, 8, 12] as const;
export const ATTENDANCE = ["present", "late", "excused", "absent"] as const;
export type Attendance = (typeof ATTENDANCE)[number];

/** Start of the window for "current" posts: those that began less than `hours` ago are still shown. */
export const startedSince = (hours = 12) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
/** Whether a post has not started yet (it can still be cancelled). */
export const notStartedYet = (startsAt: string) => new Date(startsAt).getTime() > Date.now();
