"use client";

import { useActionState } from "react";
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
  const [state, action, pending] = useActionState<BookingState, FormData>(bookSeats, { status: "idle" });

  if (state.status === "sent") {
    return <p role="status" className="m-0 rounded-2xl bg-gold/12 p-5 leading-[1.8] text-gold">{labels.sent}</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="m-0 font-display text-2xl font-semibold">{labels.title}</h2>
      <input type="hidden" name="event_id" value={eventId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="b-name" className="label">{labels.name}</label>
        <input id="b-name" name="full_name" required autoComplete="name" defaultValue={defaultName} className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="b-email" className="label">{labels.email}</label>
        <input id="b-email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} dir="ltr" className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="b-phone" className="label">{labels.phone}</label>
          <input id="b-phone" name="phone" type="tel" autoComplete="tel" dir="ltr" className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="b-seats" className="label">{labels.seats}</label>
          <input id="b-seats" name="seats" type="number" min={1} max={10} defaultValue={1} required className="field" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="b-note" className="label">{labels.note}</label>
        <textarea id="b-note" name="note" rows={3} className="field" />
      </div>
      {state.status === "error" && <p role="alert" className="m-0 text-rose">{labels.error}</p>}
      {state.status === "closed" && <p role="alert" className="m-0 text-rose">{labels.closed}</p>}
      <button type="submit" disabled={pending} className="btn-gold min-h-[50px]! disabled:opacity-60">{labels.submit}</button>
    </form>
  );
}
