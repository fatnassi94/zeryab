"use client";

import { useActionState, useEffect, useRef } from "react";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePassword, saveProfile, type PasswordState, type ProfileState } from "../actions";

type ProfileLabels = {
  fullName: string; displayName: string; displayNameHint: string; instruments: string; instrumentsHint: string;
  phone: string; phoneHint: string; language: string; save: string; saved: string; error: string; fieldError: string;
};

export function ProfileForm({ values, labels, languages }: {
  values: { fullName: string; displayName: string; instruments: string; phone: string; locale: string };
  labels: ProfileLabels;
  languages: { value: string; label: string }[];
}) {
  const [state, action] = useActionState<ProfileState, FormData>(saveProfile, { status: "idle" });
  const bad = (k: keyof NonNullable<ProfileState["errors"]>) => (state.errors?.[k] ? labels.fieldError : undefined);
  return (
    <form action={action} className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
      <TextField id="p-name" name="fullName" label={labels.fullName} defaultValue={values.fullName} required minLength={2} maxLength={120} autoComplete="name" error={bad("fullName")} />
      <TextField id="p-display" name="displayName" label={labels.displayName} hint={labels.displayNameHint} defaultValue={values.displayName} maxLength={60} error={bad("displayName")} />
      <TextField id="p-instr" name="instruments" label={labels.instruments} hint={labels.instrumentsHint} defaultValue={values.instruments} maxLength={260} error={bad("instruments")} />
      <TextField id="p-phone" name="phone" type="tel" dir="ltr" label={labels.phone} hint={labels.phoneHint} defaultValue={values.phone} maxLength={25} autoComplete="tel" error={bad("phone")} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-lang" className="label">{labels.language}</label>
        <select id="p-lang" name="locale" defaultValue={values.locale} className="field">
          {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <SubmitButton>{labels.save}</SubmitButton>
        <span aria-live="polite">
          {state.status === "saved" && <Notice tone="success">{labels.saved}</Notice>}
          {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
          {state.status === "fields" && <Notice tone="error">{labels.fieldError}</Notice>}
        </span>
      </div>
    </form>
  );
}

type PasswordLabels = {
  current: string; next: string; nextHint: string; save: string; saved: string; wrong: string; weak: string; same: string; error: string;
};

/** Password change; clears itself once done. */
export function PasswordForm({ labels }: { labels: PasswordLabels }) {
  const [state, action] = useActionState<PasswordState, FormData>(changePassword, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "saved") form.current?.reset();
  }, [state]);
  const message = { idle: null, saved: null, wrong: labels.wrong, weak: labels.weak, same: labels.same, error: labels.error }[state.status];
  return (
    <form ref={form} action={action} className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
      <TextField id="pw-current" name="current" type="password" label={labels.current} required autoComplete="current-password"
        error={state.status === "wrong" ? labels.wrong : undefined} />
      <TextField id="pw-next" name="next" type="password" label={labels.next} hint={labels.nextHint} required minLength={8} maxLength={72} autoComplete="new-password"
        error={state.status === "weak" || state.status === "same" ? message : undefined} />
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <SubmitButton>{labels.save}</SubmitButton>
        <span aria-live="polite">
          {state.status === "saved" && <Notice tone="success">{labels.saved}</Notice>}
          {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
        </span>
      </div>
    </form>
  );
}
