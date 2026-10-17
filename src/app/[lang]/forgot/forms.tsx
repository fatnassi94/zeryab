"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type ResetState } from "../login/actions";

type Labels = Record<
  "email" | "sendLink" | "linkSent" | "error" | "newPassword" | "passwordHint" | "savePassword" | "resetExpired",
  string
>;

export function ForgotForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestPasswordReset, { status: "idle" });

  if (state.status === "sent") {
    return <p role="status" className="m-0 rounded-2xl bg-gold/12 p-5 leading-[1.8] text-gold">{labels.linkSent}</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-email" className="label">{labels.email}</label>
        <input id="f-email" name="email" type="email" required autoComplete="email" dir="ltr" className="field" />
      </div>
      {state.status === "error" && <p role="alert" className="m-0 text-rose">{labels.error}</p>}
      <button type="submit" disabled={pending} className="btn-gold min-h-[50px]! disabled:opacity-60">{labels.sendLink}</button>
    </form>
  );
}

export function ResetForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(updatePassword, { status: "idle" });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="r-pass" className="label">{labels.newPassword}</label>
        <input
          id="r-pass"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="r-pass-hint"
          dir="ltr"
          className="field"
        />
        <span id="r-pass-hint" className="text-[13px] text-muted">{labels.passwordHint}</span>
      </div>
      {state.status === "error" && <p role="alert" className="m-0 text-rose">{labels.error}</p>}
      {state.status === "expired" && <p role="alert" className="m-0 text-rose">{labels.resetExpired}</p>}
      <button type="submit" disabled={pending} className="btn-gold min-h-[50px]! disabled:opacity-60">{labels.savePassword}</button>
    </form>
  );
}
