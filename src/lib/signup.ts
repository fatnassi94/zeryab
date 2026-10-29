/**
 * Sign-up checks, run on the server for every submission (the form's own
 * checks are only a convenience). Supabase Auth adds its own limits on top:
 * rate limits, email confirmation and, when enabled, leaked-password checks.
 */
export const MEMBER_PARTS = ["lead_vocal", "percussion", "instrument"] as const;
export type MemberPart = (typeof MEMBER_PARTS)[number];

export type SignupInput = { fullName: string; email: string; password: string; part: string; instrument: string };
export type SignupError = "name" | "email" | "passwordShort" | "passwordLong" | "passwordWeak" | "part" | "instrument";
export type SignupResult =
  | { ok: true; value: { fullName: string; email: string; password: string; part: MemberPart; instrument: string } }
  | { ok: false; errors: Partial<Record<keyof SignupInput, SignupError>> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function checkSignup(input: SignupInput): SignupResult {
  const fullName = input.fullName.replace(/\s+/g, " ").trim();
  const email = input.email.trim().toLowerCase();
  const { password } = input;
  const instrument = input.instrument.replace(/\s+/g, " ").trim();
  const errors: Partial<Record<keyof SignupInput, SignupError>> = {};

  if (fullName.length < 2 || fullName.length > 120) errors.fullName = "name";
  if (!EMAIL.test(email) || email.length > 254) errors.email = "email";

  const pw = passwordError(password, email);
  if (pw) errors.password = pw;

  if (!(MEMBER_PARTS as readonly string[]).includes(input.part)) errors.part = "part";
  else if (input.part === "instrument" && (instrument.length < 2 || instrument.length > 60)) errors.instrument = "instrument";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { fullName, email, password, part: input.part as MemberPart, instrument: input.part === "instrument" ? instrument : "" },
  };
}

/** Password rules shared by sign-up and password reset. */
export function passwordError(password: string, email = ""): "passwordShort" | "passwordLong" | "passwordWeak" | null {
  const local = email.trim().toLowerCase().split("@")[0];
  if (password.length < 8) return "passwordShort";
  if (password.length > 72) return "passwordLong"; // bcrypt ignores anything longer
  if (
    /^(.)\1+$/.test(password) ||
    (local.length >= 4 && password.toLowerCase().includes(local)) ||
    /^(?:12345678|password|azerty|qwerty)/i.test(password)
  ) return "passwordWeak";
  return null;
}

/** Bot traps: a field humans never see, and a form filled faster than a person can type. */
export function looksLikeBot(honeypot: string, startedAt: string, now = Date.now()) {
  const t = Number(startedAt);
  return honeypot.trim() !== "" || !startedAt.trim() || !Number.isFinite(t) || t <= 0 || now - t < 2500;
}

export type ProfileInput = { fullName: string; displayName: string; instruments: string; phone: string; locale: string };
export type ProfileResult =
  | { ok: true; value: { full_name: string; display_name: string | null; instruments: string[]; phone: string | null; preferred_locale: "ar" | "fr" | "en" } }
  | { ok: false; errors: Partial<Record<keyof ProfileInput, true>> };

/** A member's own profile (name, instruments, phone, language); the part and status stay with the admin. */
export function checkProfile(input: ProfileInput): ProfileResult {
  const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
  const fullName = tidy(input.fullName);
  const displayName = tidy(input.displayName);
  const instruments = [...new Set(input.instruments.split(/[,،\n]/).map(tidy).filter(Boolean))];
  const phone = tidy(input.phone);
  const errors: Partial<Record<keyof ProfileInput, true>> = {};

  if (fullName.length < 2 || fullName.length > 120) errors.fullName = true;
  if (displayName.length > 60) errors.displayName = true;
  if (instruments.length > 6 || instruments.some((i) => i.length < 2 || i.length > 40)) errors.instruments = true;
  if (phone && !/^\+?[\d\s().-]{6,25}$/.test(phone)) errors.phone = true;
  if (!["ar", "fr", "en"].includes(input.locale)) errors.locale = true;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { full_name: fullName, display_name: displayName || null, instruments, phone: phone || null, preferred_locale: input.locale as "ar" | "fr" | "en" },
  };
}
