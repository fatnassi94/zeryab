"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { status: "idle" | "invalid" | "error" | "check-email" };

/** Only same-site paths, never an absolute URL (open-redirect guard). */
function safeNext(value: FormDataEntryValue | null, locale: string) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/members`;
}

function localeOf(formData: FormData) {
  const l = String(formData.get("locale") ?? "ar");
  return hasLocale(l) ? l : "ar";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { status: error.code === "invalid_credentials" ? "invalid" : "error" };
  redirect(safeNext(formData.get("next"), locale));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { status: "error" };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const next = `/${locale}/join`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
    options: {
      data: { full_name: String(formData.get("full_name") ?? "").trim(), locale },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { status: "error" };
  // With email confirmation on, there is no session yet.
  if (!data.session) return { status: "check-email" };
  redirect(next);
}

export async function signOut(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

export type ResetState = { status: "idle" | "sent" | "error" | "expired" };

/** Always reports "sent" so the form doesn't reveal which emails have accounts. */
export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const locale = localeOf(formData);
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error" };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(`/${locale}/reset`)}`,
  });
  return { status: "sent" };
}

export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const locale = localeOf(formData);
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { status: "error" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { status: "expired" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error" };
  redirect(`/${locale}/members`);
}
