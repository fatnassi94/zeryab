import { MEMBER_PARTS, type MemberPart } from "./signup";

/**
 * Members as the back office manages them: roles, pre-approved invites and the
 * admin's edit form. Every check runs again on the server (and RLS on top).
 */
export const ROLES = ["member", "teacher", "activity_manager", "librarian", "admin"] as const;
export type MemberRole = (typeof ROLES)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

/** Roles picked in a form: known ones only, in the usual order; "member" is always included. */
export function pickRoles(values: string[]): MemberRole[] {
  return ROLES.filter((r) => r === "member" || values.includes(r));
}

export type InviteResult =
  | { ok: true; value: { email: string; full_name: string; part: MemberPart | null; roles: MemberRole[] } }
  | { ok: false; errors: Partial<Record<"email" | "name" | "part", true>> };

export function checkInvite(input: { email: string; name: string; part: string; roles: string[] }): InviteResult {
  const email = input.email.trim().toLowerCase();
  const name = tidy(input.name);
  const errors: Partial<Record<"email" | "name" | "part", true>> = {};
  if (!EMAIL.test(email) || email.length > 254) errors.email = true;
  if (name.length < 2 || name.length > 120) errors.name = true;
  if (input.part && !(MEMBER_PARTS as readonly string[]).includes(input.part)) errors.part = true;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { email, full_name: name, part: (input.part || null) as MemberPart | null, roles: pickRoles(input.roles) } };
}

export type MemberEditResult =
  | { ok: true; value: { full_name: string; part: MemberPart | null; instruments: string[]; phone: string | null; admin_notes: string | null } }
  | { ok: false; errors: Partial<Record<"name" | "part" | "instruments" | "phone" | "notes", true>> };

/** The admin's edit of a member (status and roles are separate actions). */
export function checkMemberEdit(input: { name: string; part: string; instruments: string; phone: string; notes: string }): MemberEditResult {
  const name = tidy(input.name);
  const instruments = [...new Set(input.instruments.split(/[,،\n]/).map(tidy).filter(Boolean))];
  const phone = tidy(input.phone);
  const notes = input.notes.trim();
  const errors: Partial<Record<"name" | "part" | "instruments" | "phone" | "notes", true>> = {};
  if (name.length < 2 || name.length > 120) errors.name = true;
  if (input.part && !(MEMBER_PARTS as readonly string[]).includes(input.part)) errors.part = true;
  if (instruments.length > 6 || instruments.some((i) => i.length < 2 || i.length > 40)) errors.instruments = true;
  if (phone && !/^\+?[\d\s().-]{6,25}$/.test(phone)) errors.phone = true;
  if (notes.length > 2000) errors.notes = true;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { full_name: name, part: (input.part || null) as MemberPart | null, instruments, phone: phone || null, admin_notes: notes || null } };
}

/** What changes when roles are saved: an admin never removes their own admin role. */
export function roleChanges(current: string[], wanted: MemberRole[], isSelf: boolean) {
  const target = isSelf && current.includes("admin") && !wanted.includes("admin") ? [...wanted, "admin" as const] : wanted;
  return {
    add: target.filter((r) => !current.includes(r)),
    remove: current.filter((r) => !(target as string[]).includes(r)),
  };
}
