"use client";

import { useActionState, useEffect, useRef } from "react";
import { TextArea, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLES } from "@/lib/members";
import { MEMBER_PARTS } from "@/lib/signup";
import { createInvite, saveMember, type InviteState, type MemberState } from "../actions";

type Options = { parts: Record<string, string>; noPart: string; roles: Record<string, string> };

function PartSelect({ id, value, label, options }: { id: string; value: string; label: string; options: Options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} name="part" defaultValue={value} className="field">
        <option value="">{options.noPart}</option>
        {MEMBER_PARTS.map((p) => <option key={p} value={p}>{options.parts[p]}</option>)}
      </select>
    </div>
  );
}

/** Role checkboxes; "member" is always on. */
export function RoleChecks({ picked, labels, legend, lockAdmin = false }: { picked: string[]; labels: Record<string, string>; legend: string; lockAdmin?: boolean }) {
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend className="label mb-1.5">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {ROLES.map((r) => {
          const locked = r === "member" || (lockAdmin && r === "admin");
          return (
            <label key={r} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="roles" value={r} defaultChecked={picked.includes(r) || r === "member"} disabled={locked}
                className="size-4 accent-[var(--color-gold)]" />
              {labels[r]}
              {locked && <input type="hidden" name="roles" value={r} />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type InviteLabels = { name: string; email: string; part: string; roles: string; add: string; added: string; exists: string; error: string; fieldError: string };

/** Pre-approval of someone who will sign up with this email. Clears itself after adding. */
export function InviteForm({ locale, labels, options }: { locale: string; labels: InviteLabels; options: Options }) {
  const [state, action] = useActionState<InviteState, FormData>(createInvite, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "added") form.current?.reset();
  }, [state]);
  const bad = (k: keyof NonNullable<InviteState["errors"]>) => (state.errors?.[k] ? labels.fieldError : undefined);
  return (
    <form ref={form} action={action} className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
      <input type="hidden" name="locale" value={locale} />
      <TextField id="i-name" name="name" label={labels.name} required minLength={2} maxLength={120} error={bad("name")} />
      <TextField id="i-email" name="email" type="email" dir="ltr" label={labels.email} required maxLength={254} error={bad("email")} />
      <PartSelect id="i-part" value="" label={labels.part} options={options} />
      <div className="col-span-full"><RoleChecks picked={["member"]} labels={options.roles} legend={labels.roles} /></div>
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <SubmitButton>{labels.add}</SubmitButton>
        <span aria-live="polite">
          {state.status === "added" && <Notice tone="success">{labels.added}</Notice>}
          {state.status === "exists" && <Notice tone="error">{labels.exists}</Notice>}
          {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
        </span>
      </div>
    </form>
  );
}

type MemberLabels = { name: string; part: string; instruments: string; instrumentsHint: string; phone: string; notes: string; notesHint: string; save: string; saved: string; error: string; fieldError: string };

export function MemberForm({ locale, id, values, labels, options }: {
  locale: string; id: string; values: { name: string; part: string; instruments: string; phone: string; notes: string }; labels: MemberLabels; options: Options;
}) {
  const [state, action] = useActionState<MemberState, FormData>(saveMember, { status: "idle" });
  const bad = (k: keyof NonNullable<MemberState["errors"]>) => (state.errors?.[k] ? labels.fieldError : undefined);
  return (
    <form action={action} className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <TextField id="m-name" name="name" label={labels.name} defaultValue={values.name} required minLength={2} maxLength={120} error={bad("name")} />
      <PartSelect id="m-part" value={values.part} label={labels.part} options={options} />
      <TextField id="m-instr" name="instruments" label={labels.instruments} hint={labels.instrumentsHint} defaultValue={values.instruments} maxLength={260} error={bad("instruments")} />
      <TextField id="m-phone" name="phone" type="tel" dir="ltr" label={labels.phone} defaultValue={values.phone} maxLength={25} error={bad("phone")} />
      <div className="col-span-full">
        <TextArea id="m-notes" name="notes" label={labels.notes} hint={labels.notesHint} defaultValue={values.notes} maxLength={2000} rows={3} error={bad("notes")} />
      </div>
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <SubmitButton>{labels.save}</SubmitButton>
        <span aria-live="polite">
          {state.status === "saved" && <Notice tone="success">{labels.saved}</Notice>}
          {state.status === "error" && <Notice tone="error">{labels.error}</Notice>}
          {state.status === "fields" && <Notice tone="error">{labels.fieldError}</Notice>}
        </span>
      </div>
    </form>
  );
}
