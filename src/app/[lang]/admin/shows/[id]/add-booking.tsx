"use client";

import { useActionState, useEffect, useRef } from "react";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { addBooking, type AddBookingState } from "../actions";

type Labels = {
  name: string; email: string; phone: string; seats: string; note: string; status: string; confirmed: string; waitlist: string;
  add: string; added: string; error: string; fieldError: string;
};

/** A booking taken by phone or at the door. Clears itself after adding. */
export function AddBooking({ show, locale, labels }: { show: string; locale: string; labels: Labels }) {
  const [state, action] = useActionState<AddBookingState, FormData>(addBooking, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "added") form.current?.reset();
  }, [state]);
  const bad = (k: keyof NonNullable<AddBookingState["errors"]>) => (state.errors?.[k] ? labels.fieldError : undefined);

  return (
    <form ref={form} action={action} className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] items-start gap-4">
      <input type="hidden" name="show" value={show} />
      <input type="hidden" name="locale" value={locale} />
      <TextField id="b-name" name="name" label={labels.name} required minLength={2} maxLength={120} error={bad("name")} />
      <TextField id="b-phone" name="phone" type="tel" dir="ltr" label={labels.phone} maxLength={40} error={bad("phone")} />
      <TextField id="b-email" name="email" type="email" dir="ltr" label={labels.email} maxLength={200} error={bad("email")} />
      <TextField id="b-seats" name="seats" type="number" min={1} max={10} defaultValue={1} dir="ltr" label={labels.seats} required error={bad("seats")} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="b-status" className="label">{labels.status}</label>
        <select id="b-status" name="status" defaultValue="confirmed" className="field">
          <option value="confirmed">{labels.confirmed}</option>
          <option value="waitlist">{labels.waitlist}</option>
        </select>
      </div>
      <TextField id="b-note" name="note" label={labels.note} maxLength={500} />
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <SubmitButton>{labels.add}</SubmitButton>
        <span aria-live="polite">
          {state.status === "added" && <Notice tone="success">{labels.added}</Notice>}
          {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
        </span>
      </div>
    </form>
  );
}
