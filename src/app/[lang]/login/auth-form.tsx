"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
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
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {
    status: "idle",
  });

  if (state.status === "check-email") return <Notice tone="success">{labels.checkEmail}</Notice>;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "signup" && <TextField id="a-name" name="full_name" label={labels.fullName} required autoComplete="name" defaultValue={state.fullName} />}
      <TextField id="a-email" name="email" type="email" label={labels.email} required autoComplete="email" defaultValue={state.email} dir="ltr" />
      <TextField
        id="a-pass"
        name="password"
        type="password"
        label={labels.password}
        required
        minLength={mode === "signup" ? 8 : undefined}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        hint={mode === "signup" ? labels.passwordHint : undefined}
        dir="ltr"
      />
      {state.status === "invalid" && <Notice tone="error">{labels.invalid}</Notice>}
      {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      <SubmitButton>{mode === "login" ? labels.login : labels.signup}</SubmitButton>
    </form>
  );
}
