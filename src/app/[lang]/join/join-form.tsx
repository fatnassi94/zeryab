"use client";

import { useActionState } from "react";
import { TextArea, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { applyForMembership, type JoinState } from "./actions";

type Labels = {
  fullName: string;
  phone: string;
  instruments: string;
  instrumentsHint: string;
  experience: string;
  message: string;
  submit: string;
  sent: string;
  error: string;
};

export function JoinForm({ locale, defaultName, labels }: { locale: string; defaultName: string; labels: Labels }) {
  const [state, action] = useActionState<JoinState, FormData>(applyForMembership, { status: "idle" });

  if (state.status === "sent") return <Notice tone="success">{labels.sent}</Notice>;
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <TextField id="j-name" name="full_name" label={labels.fullName} required defaultValue={v?.full_name ?? defaultName} autoComplete="name" />
      <TextField id="j-phone" name="phone" type="tel" label={labels.phone} autoComplete="tel" defaultValue={v?.phone} dir="ltr" />
      <TextField id="j-instr" name="instruments" label={labels.instruments} hint={labels.instrumentsHint} defaultValue={v?.instruments} />
      <TextArea id="j-exp" name="experience" label={labels.experience} defaultValue={v?.experience} />
      <TextArea id="j-msg" name="message" label={labels.message} defaultValue={v?.message} />
      {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      <SubmitButton>{labels.submit}</SubmitButton>
    </form>
  );
}
