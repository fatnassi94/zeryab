import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Role = "member" | "teacher" | "activity_manager" | "librarian" | "admin";
export type MemberStatus = Database["public"]["Enums"]["member_status"];

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string;
  status: MemberStatus;
  roles: Role[];
  isActive: boolean;
  isAdmin: boolean;
  has: (role: Role) => boolean;
};

/**
 * The signed-in user with profile and roles, read once per request.
 * UI checks use this; the database enforces the same rules through RLS.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, display_name, status").eq("id", claims.sub).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", claims.sub),
  ]);

  const roles = (roleRows ?? []).map((r) => r.role as Role);
  const status = profile?.status ?? "pending";
  const isActive = status === "active" && roles.length > 0;
  const isAdmin = isActive && roles.includes("admin");

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    fullName: profile?.display_name || profile?.full_name || "",
    status,
    roles,
    isActive,
    isAdmin,
    has: (role) => isActive && (roles.includes(role) || roles.includes("admin")),
  };
});

export async function requireViewer(locale: Locale, next?: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return viewer;
}

/** For staff areas: any of the given roles (admin always passes). */
export async function requireRole(locale: Locale, roles: Role[]) {
  const viewer = await requireViewer(locale);
  if (!roles.some((r) => viewer.has(r))) redirect(`/${locale}/members`);
  return viewer;
}

export const isStaff = (viewer: Viewer | null) =>
  !!viewer && (["teacher", "activity_manager", "librarian", "admin"] as Role[]).some((r) => viewer.has(r));
