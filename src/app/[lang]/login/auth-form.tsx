"use client";

import { useActionState, useEffect, useState } from "react";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { MEMBER_PARTS, type SignupError } from "@/lib/signup";
import { signIn, signUp, type AuthState } from "./actions";

type Labels = {
  email: string;
  password: string;
  passwordHint: string;
  fullName: string;
  login: string;
  signup: string;
  signupIntro: string;
  checkEmail: string;
  invalid: string;
  error: string;
  offline: string;
  part: string;
  instrument: string;
  instrumentHint: string;
  errors: Record<SignupError, string>;
};

export function AuthForm({ mode, locale, next, labels, parts }: {
  mode: "login" | "signup";
  locale: string;
  next?: string;
  labels: Labels;
  parts: Record<(typeof MEMBER_PARTS)[number], string>;
}) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {
    status: "idle",
  });
  const [part, setPart] = useState(state.part ?? "");
  const [started, setStarted] = useState("");

  // When the form appeared (a bot check on the server). Kept in state (React would reset a hidden
  // input's value on re-render) and set after hydration so server and client HTML match.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setStarted(String(Date.now())));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (state.status === "check-email") return <Notice tone="success">{labels.checkEmail}</Notice>;
  const err = (k: keyof NonNullable<AuthState["errors"]>) => (state.errors?.[k] ? labels.errors[state.errors[k]] : undefined);
  const signup = mode === "signup";

  return (
    <form action={action} className="flex flex-col gap-4" noValidate={signup}>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {signup && (
        <>
          <p className="m-0 text-sm leading-[1.8] text-muted">{labels.signupIntro}</p>
          <input type="hidden" name="started" value={started} />
          {/* Left empty by people; filled by form bots. */}
          <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="a-website">Website</label>
            <input id="a-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <TextField id="a-name" name="full_name" label={labels.fullName} required autoComplete="name" maxLength={120}
            defaultValue={state.fullName} error={err("fullName")} />
        </>
      )}
      <TextField id="a-email" name="email" type="email" label={labels.email} required autoComplete="email" maxLength={254}
        defaultValue={state.email} dir="ltr" error={signup ? err("email") : undefined} />
      <TextField
        id="a-pass"
        name="password"
        type="password"
        label={labels.password}
        required
        minLength={signup ? 8 : undefined}
        maxLength={signup ? 72 : undefined}
        autoComplete={signup ? "new-password" : "current-password"}
        hint={signup ? labels.passwordHint : undefined}
        error={signup ? err("password") : undefined}
        dir="ltr"
      />
      {signup && (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={err("part") ? "a-part-error" : undefined}>
          <legend className="label mb-1.5">{labels.part}</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
            {MEMBER_PARTS.map((p) => (
              <label key={p}
                className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-[15px] ${part === p ? "border-gold/60 bg-gold/10 text-text" : "border-line text-soft hover:border-line-strong"}`}>
                <input type="radio" name="part" value={p} checked={part === p} onChange={() => setPart(p)} className="accent-gold" required />
                {parts[p]}
              </label>
            ))}
          </div>
          {err("part") && <span id="a-part-error" className="text-[13px] text-rose">{err("part")}</span>}
        </fieldset>
      )}
      {signup && part === "instrument" && (
        <TextField id="a-instrument" name="instrument" label={labels.instrument} hint={labels.instrumentHint} required maxLength={60}
          defaultValue={state.instrument} error={err("instrument")} />
      )}
      {state.status === "invalid" && <Notice tone="error">{labels.invalid}</Notice>}
      {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      {state.status === "offline" && <Notice tone="error">{labels.offline}</Notice>}
      <SubmitButton>{mode === "login" ? labels.login : labels.signup}</SubmitButton>
    </form>
  );
}
