"use client";

import { useActionState } from "react";
import { TextArea, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { SHOW_KINDS, SHOW_STATUSES, type ShowKind, type ShowStatus } from "@/lib/shows";
import { saveShow, type ShowState } from "./actions";

export type ShowValues = {
  id?: string; kind: ShowKind; title: string; summary: string; description: string; date: string; time: string; endTime: string;
  venue: string; address: string; mapUrl: string; bookable: boolean; capacity: string; price: string;
  closesDate: string; closesTime: string; status: ShowStatus;
};

type Labels = {
  kind: string; kinds: Record<ShowKind, string>; titleField: string; summary: string; summaryHint: string; description: string;
  date: string; time: string; endTime: string; venue: string; address: string; mapUrl: string; mapHint: string;
  booking: string; bookable: string; capacity: string; capacityHint: string; price: string; priceHint: string;
  closes: string; closesTime: string; closesHint: string; statusField: string; statuses: Record<ShowStatus, string>;
  create: string; save: string; saved: string; error: string; fieldError: string; when: string; where: string; details: string;
};

/** New show, or the changes to one. Club times are Tunis times. */
export function ShowForm({ locale, values, labels }: { locale: string; values: ShowValues; labels: Labels }) {
  const [state, action] = useActionState<ShowState, FormData>(saveShow, { status: "idle" });
  const bad = (k: keyof NonNullable<ShowState["errors"]>) => (state.errors?.[k] ? labels.fieldError : undefined);
  const group = "grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4";
  const legend = "mb-3 font-display text-lg font-semibold text-gold";

  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="locale" value={locale} />
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{labels.details}</legend>
        <div className={group}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-kind" className="label">{labels.kind}</label>
            <select id="s-kind" name="kind" defaultValue={values.kind} className="field">
              {SHOW_KINDS.map((k) => <option key={k} value={k}>{labels.kinds[k]}</option>)}
            </select>
          </div>
          <div className="col-span-full sm:col-span-2">
            <TextField id="s-title" name="title" label={labels.titleField} defaultValue={values.title} required minLength={3} maxLength={140} error={bad("title")} />
          </div>
          <div className="col-span-full">
            <TextArea id="s-summary" name="summary" label={labels.summary} hint={labels.summaryHint} defaultValue={values.summary} maxLength={300} rows={2} error={bad("summary")} />
          </div>
          <div className="col-span-full">
            <TextArea id="s-description" name="description" label={labels.description} defaultValue={values.description} maxLength={4000} rows={6} error={bad("description")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{labels.when}</legend>
        <div className={group}>
          <TextField id="s-date" name="date" type="date" label={labels.date} defaultValue={values.date} required error={bad("date")} />
          <TextField id="s-time" name="time" type="time" label={labels.time} defaultValue={values.time} required error={bad("time")} />
          <TextField id="s-end" name="endTime" type="time" label={labels.endTime} defaultValue={values.endTime} error={bad("endTime")} />
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{labels.where}</legend>
        <div className={group}>
          <TextField id="s-venue" name="venue" label={labels.venue} defaultValue={values.venue} maxLength={140} error={bad("venue")} />
          <TextField id="s-address" name="address" label={labels.address} defaultValue={values.address} maxLength={200} error={bad("address")} />
          <TextField id="s-map" name="mapUrl" type="url" dir="ltr" label={labels.mapUrl} hint={labels.mapHint} defaultValue={values.mapUrl} maxLength={500} error={bad("mapUrl")} />
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{labels.booking}</legend>
        <div className={group}>
          <label className="col-span-full flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" name="bookable" defaultChecked={values.bookable} className="size-5 accent-[var(--color-gold)]" />
            <span>{labels.bookable}</span>
          </label>
          <TextField id="s-capacity" name="capacity" type="number" min={1} inputMode="numeric" dir="ltr" label={labels.capacity} hint={labels.capacityHint} defaultValue={values.capacity} error={bad("capacity")} />
          <TextField id="s-price" name="price" inputMode="decimal" dir="ltr" label={labels.price} hint={labels.priceHint} defaultValue={values.price} error={bad("price")} />
          <TextField id="s-closes" name="closesDate" type="date" label={labels.closes} hint={labels.closesHint} defaultValue={values.closesDate} error={bad("closes")} />
          <TextField id="s-closes-t" name="closesTime" type="time" label={labels.closesTime} defaultValue={values.closesTime} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-4 border-t border-white/8 pt-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-status" className="label">{labels.statusField}</label>
          <select id="s-status" name="status" defaultValue={values.status} className="field">
            {SHOW_STATUSES.map((st) => <option key={st} value={st}>{labels.statuses[st]}</option>)}
          </select>
        </div>
        <SubmitButton>{values.id ? labels.save : labels.create}</SubmitButton>
        <span aria-live="polite">
          {state.status === "saved" && <Notice tone="success">{labels.saved}</Notice>}
          {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
          {state.status === "fields" && <Notice tone="error">{labels.fieldError}</Notice>}
        </span>
      </div>
    </form>
  );
}
