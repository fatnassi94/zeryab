"use client";

import { useActionState, useEffect, useRef } from "react";
import { TextArea, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { POST_KINDS } from "@/lib/posts";
import { createPost, type PostState } from "./actions";

type Labels = {
  kind: string; kinds: Record<(typeof POST_KINDS)[number], string>; titleField: string; titleHint: string;
  message: string; date: string; time: string; venue: string; publish: string; published: string; error: string; fieldError: string;
};

/** New post for the members. The form clears itself after a successful publish. */
export function PostForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [state, action] = useActionState<PostState, FormData>(createPost, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "sent") form.current?.reset();
  }, [state]);
  const bad = (k: keyof NonNullable<PostState["errors"]>) => (state.errors?.[k] ? labels.fieldError : undefined);

  return (
    <form ref={form} action={action}
      className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-kind" className="label">{labels.kind}</label>
        <select id="p-kind" name="kind" defaultValue="rehearsal" className="field">
          {POST_KINDS.map((k) => <option key={k} value={k}>{labels.kinds[k]}</option>)}
        </select>
      </div>
      <TextField id="p-title" name="title" label={labels.titleField} hint={labels.titleHint} required maxLength={140} error={bad("title")} />
      <TextField id="p-date" name="date" type="date" label={labels.date} required error={bad("date")} />
      <TextField id="p-time" name="time" type="time" label={labels.time} required defaultValue="18:00" error={bad("time")} />
      <TextField id="p-venue" name="venue" label={labels.venue} maxLength={140} error={bad("venue")} />
      <div className="col-span-full">
        <TextArea id="p-message" name="message" label={labels.message} maxLength={2000} rows={3} error={bad("message")} />
      </div>
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <SubmitButton>{labels.publish}</SubmitButton>
        {state.status === "sent" && <Notice tone="success">{labels.published}</Notice>}
        {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
      </div>
    </form>
  );
}
