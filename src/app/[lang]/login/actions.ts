"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

/** `email`/`fullName` echo the submission so the form keeps them after an error. */
export type AuthState = { status: "idle" | "invalid" | "error" | "offline" | "check-email"; email?: string; fullName?: string };

/** Only same-site paths, never an absolute URL (open-redirect guard). */
function safeNext(value: FormDataEntryValue | null, locale: string) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/members`;
}

/** Supabase never answered (connection dropped, DNS, timeout): say so instead of a generic error. */
const unreachable = (error: { name?: string; status?: number }) => error.name === "AuthRetryableFetchError" || !error.status;

function localeOf(formData: FormData) {
  const l = String(formData.get("locale") ?? "ar");
  return hasLocale(l) ? l : "ar";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    if (error.code === "invalid_credentials") return { status: "invalid", email };
    console.error("[login] sign-in failed:", error.name, error.status ?? "-", error.code ?? "-", error.message);
    return { status: unreachable(error) ? "offline" : "error", email };
  }
  redirect(safeNext(formData.get("next"), locale));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = localeOf(formData);
  const password = String(formData.get("password") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (password.length < 8) return { status: "error", email, fullName };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const next = `/${locale}/join`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, locale },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    console.error("[signup] failed:", error.name, error.status ?? "-", error.code ?? "-", error.message);
    return { status: unreachable(error) ? "offline" : "error", email, fullName };
  }
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
