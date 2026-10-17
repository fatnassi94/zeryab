"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

type Labels = {
  email: string;
  password: string;
  passwordHint: string;
  fullName: string;
  login: string;
  signup: string;
  checkEmail: string;
  invalid: string;
  error: string;
};

export function AuthForm({ mode, locale, next, labels }: {
  mode: "login" | "signup";
  locale: string;
  next?: string;
  labels: Labels;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {
    status: "idle",
  });

  if (state.status === "check-email") {
    return <p role="status" className="m-0 rounded-2xl bg-gold/12 p-5 leading-[1.8] text-gold">{labels.checkEmail}</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "signup" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="a-name" className="label">{labels.fullName}</label>
          <input id="a-name" name="full_name" required autoComplete="name" className="field" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="a-email" className="label">{labels.email}</label>
        <input id="a-email" name="email" type="email" required autoComplete="email" dir="ltr" className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="a-pass" className="label">{labels.password}</label>
        <input
          id="a-pass"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-describedby={mode === "signup" ? "a-pass-hint" : undefined}
          dir="ltr"
          className="field"
        />
        {mode === "signup" && <span id="a-pass-hint" className="text-[13px] text-muted">{labels.passwordHint}</span>}
      </div>
      {state.status === "invalid" && <p role="alert" className="m-0 text-rose">{labels.invalid}</p>}
      {state.status === "error" && <p role="alert" className="m-0 text-rose">{labels.error}</p>}
      <button type="submit" disabled={pending} className="btn-gold min-h-[50px]! disabled:opacity-60">
        {mode === "login" ? labels.login : labels.signup}
      </button>
    </form>
  );
}
