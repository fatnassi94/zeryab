"use client";

import { useActionState } from "react";
import { TextArea, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { bookSeats, type BookingState } from "../actions";

type Labels = {
  title: string;
  name: string;
  email: string;
  phone: string;
  seats: string;
  note: string;
  submit: string;
  sent: string;
  closed: string;
  error: string;
};

export function BookingForm({ eventId, labels, defaultName, defaultEmail }: {
  eventId: string;
  labels: Labels;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, action] = useActionState<BookingState, FormData>(bookSeats, { status: "idle" });

  if (state.status === "sent") return <Notice tone="success">{labels.sent}</Notice>;
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="m-0 font-display text-2xl font-semibold">{labels.title}</h2>
      <input type="hidden" name="event_id" value={eventId} />
      <TextField id="b-name" name="full_name" label={labels.name} required autoComplete="name" defaultValue={v?.full_name ?? defaultName} />
      <TextField id="b-email" name="email" type="email" label={labels.email} required autoComplete="email" defaultValue={v?.email ?? defaultEmail} dir="ltr" />
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <TextField id="b-phone" name="phone" type="tel" label={labels.phone} autoComplete="tel" defaultValue={v?.phone} dir="ltr" />
        <TextField id="b-seats" name="seats" type="number" label={labels.seats} min={1} max={10} defaultValue={v?.seats ?? 1} required inputMode="numeric" />
      </div>
      <TextArea id="b-note" name="note" label={labels.note} defaultValue={v?.note} />
      {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      {state.status === "closed" && <Notice tone="error">{labels.closed}</Notice>}
      <SubmitButton>{labels.submit}</SubmitButton>
    </form>
  );
}
