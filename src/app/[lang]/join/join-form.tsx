"use client";

import { useActionState } from "react";
import { TextArea, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { applyForMembership, type JoinState } from "./actions";

type Labels = {
  part: string;
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

export function JoinForm({ locale, defaultName, labels, parts }: { locale: string; defaultName: string; labels: Labels; parts: Record<string, string> }) {
  const [state, action] = useActionState<JoinState, FormData>(applyForMembership, { status: "idle" });

  if (state.status === "sent") return <Notice tone="success">{labels.sent}</Notice>;
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <TextField id="j-name" name="full_name" label={labels.fullName} required defaultValue={v?.full_name ?? defaultName} autoComplete="name" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="j-part" className="label">{labels.part}</label>
        <select id="j-part" name="part" required defaultValue={v?.part ?? ""} className="field">
          <option value="" disabled>—</option>
          {Object.entries(parts).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
        </select>
      </div>
      <TextField id="j-phone" name="phone" type="tel" label={labels.phone} autoComplete="tel" defaultValue={v?.phone} dir="ltr" />
      <TextField id="j-instr" name="instruments" label={labels.instruments} hint={labels.instrumentsHint} defaultValue={v?.instruments} />
      <TextArea id="j-exp" name="experience" label={labels.experience} defaultValue={v?.experience} />
      <TextArea id="j-msg" name="message" label={labels.message} defaultValue={v?.message} />
      {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      <SubmitButton>{labels.submit}</SubmitButton>
    </form>
  );
}
