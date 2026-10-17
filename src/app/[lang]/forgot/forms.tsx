"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset, updatePassword, type ResetState } from "../login/actions";

type Labels = Record<
  "email" | "sendLink" | "linkSent" | "error" | "newPassword" | "passwordHint" | "savePassword" | "resetExpired",
  string
>;

export function ForgotForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [state, action] = useActionState<ResetState, FormData>(requestPasswordReset, { status: "idle" });

  if (state.status === "sent") return <Notice tone="success">{labels.linkSent}</Notice>;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <TextField id="f-email" name="email" type="email" label={labels.email} required autoComplete="email" dir="ltr" />
      {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      <SubmitButton>{labels.sendLink}</SubmitButton>
    </form>
  );
}

export function ResetForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [state, action] = useActionState<ResetState, FormData>(updatePassword, { status: "idle" });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <TextField
        id="r-pass"
        name="password"
        type="password"
        label={labels.newPassword}
        hint={labels.passwordHint}
        required
        minLength={8}
        autoComplete="new-password"
        dir="ltr"
      />
      {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      {state.status === "expired" && <Notice tone="error">{labels.resetExpired}</Notice>}
      <SubmitButton>{labels.savePassword}</SubmitButton>
    </form>
  );
}
