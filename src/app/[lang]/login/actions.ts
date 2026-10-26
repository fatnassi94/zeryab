"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { checkSignup, looksLikeBot, passwordError, type SignupError, type SignupInput } from "@/lib/signup";
import { createClient } from "@/lib/supabase/server";

/** `email`/`fullName`/`part`/`instrument` echo the submission so the form keeps them after an error (never the password). */
export type AuthState = {
  status: "idle" | "invalid" | "error" | "offline" | "check-email" | "fields";
  email?: string;
  fullName?: string;
  part?: string;
  instrument?: string;
  errors?: Partial<Record<keyof SignupInput, SignupError>>;
};

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
  const field = (k: string) => String(formData.get(k) ?? "");
  const input: SignupInput = { fullName: field("full_name"), email: field("email"), password: field("password"), part: field("part"), instrument: field("instrument") };
  const echo = { email: input.email.trim(), fullName: input.fullName.trim(), part: input.part, instrument: input.instrument.trim() };

  // Bots get the same answer as people, and no account.
  if (looksLikeBot(field("website"), field("started"))) return { status: "check-email" };

  const checked = checkSignup(input);
  if (!checked.ok) return { status: "fields", errors: checked.errors, ...echo };
  const { fullName, email, password, part, instrument } = checked.value;

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const next = `/${locale}/join`;

  const supabase = await createClient();
  // The database turns this into a pending profile and a membership request (see handle_new_user).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, locale, part, instrument },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { status: "fields", errors: { password: "passwordWeak" }, ...echo };
    console.error("[signup] failed:", error.name, error.status ?? "-", error.code ?? "-", error.message);
    return { status: unreachable(error) ? "offline" : "error", ...echo };
  }
  // With email confirmation on there is no session yet (and an already registered email looks the same).
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
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { status: "expired" };
  if (passwordError(password, String(data.claims.email ?? ""))) return { status: "error" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error" };
  redirect(`/${locale}/members`);
}
