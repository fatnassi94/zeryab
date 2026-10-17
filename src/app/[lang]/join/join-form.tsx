"use client";

import { useActionState } from "react";
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
  const [state, action, pending] = useActionState<JoinState, FormData>(applyForMembership, { status: "idle" });

  if (state.status === "sent") {
    return <p role="status" className="m-0 rounded-2xl bg-gold/12 p-5 leading-[1.8] text-gold">{labels.sent}</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="j-name" className="label">{labels.fullName}</label>
        <input id="j-name" name="full_name" required defaultValue={defaultName} autoComplete="name" className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="j-phone" className="label">{labels.phone}</label>
        <input id="j-phone" name="phone" type="tel" autoComplete="tel" dir="ltr" className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="j-instr" className="label">{labels.instruments}</label>
        <input id="j-instr" name="instruments" placeholder={labels.instrumentsHint} className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="j-exp" className="label">{labels.experience}</label>
        <textarea id="j-exp" name="experience" rows={3} className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="j-msg" className="label">{labels.message}</label>
        <textarea id="j-msg" name="message" rows={3} className="field" />
      </div>
      {state.status === "error" && <p role="alert" className="m-0 text-rose">{labels.error}</p>}
      <button type="submit" disabled={pending} className="btn-gold min-h-[50px]! disabled:opacity-60">{labels.submit}</button>
    </form>
  );
}
