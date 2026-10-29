"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Edit mode for pages managed from the back office: texts become editable in
 * place, changes are collected, and the Save button (or Ctrl/Cmd+S) sends them
 * all at once. Nothing is stored until then; leaving the page warns first.
 */
export type EditValue = string | number | string[];
type Save = (changes: Record<string, EditValue>) => Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }>;
type Status = "idle" | "dirty" | "saving" | "saved" | "error";

export type EditLabels = {
  mode: string; unsaved: string; save: string; discard: string; discardConfirm: string; saving: string; saved: string;
  error: string; invalid: string; view: string; reset: string; resetConfirm: string; locale: string;
};

type State = { s: Status; count: number; error?: string; fields: Record<string, string>; save: () => void; discard: () => void };
const Ctx = createContext<{ change: (path: string, value: EditValue) => void } | null>(null);
const StatusCtx = createContext<State>({ s: "idle", count: 0, fields: {}, save: () => {}, discard: () => {} });

export function EditProvider({ save, children }: { save: Save; children: ReactNode }) {
  const changes = useRef(new Map<string, EditValue>());
  const [state, setState] = useState<Omit<State, "save" | "discard">>({ s: "idle", count: 0, fields: {} });

  const change = useCallback((path: string, value: EditValue) => {
    changes.current.set(path, value);
    setState((st) => ({ s: "dirty", count: changes.current.size, fields: st.fields }));
  }, []);

  const send = useCallback(async () => {
    if (!changes.current.size) return;
    const batch = new Map(changes.current);
    setState((st) => ({ ...st, s: "saving" }));
    let r: Awaited<ReturnType<Save>>;
    try {
      r = await save(Object.fromEntries(batch));
    } catch {
      r = { ok: false, error: "save" };
    }
    if (r.ok) {
      // Keep only what was typed while saving.
      for (const [path, value] of batch) if (changes.current.get(path) === value) changes.current.delete(path);
      setState({ s: changes.current.size ? "dirty" : "saved", count: changes.current.size, fields: {} });
    } else {
      setState({ s: "error", count: changes.current.size, error: r.error, fields: r.fields ?? {} });
    }
  }, [save]);

  const discard = useCallback(() => {
    changes.current.clear();
    window.location.reload(); // fields keep what was typed; reload to show the saved version
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (changes.current.size) e.preventDefault();
    };
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void send();
      }
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("keydown", key);
    };
  }, [send]);

  return (
    <Ctx.Provider value={{ change }}>
      <StatusCtx.Provider value={{ ...state, save: () => void send(), discard }}>{children}</StatusCtx.Provider>
    </Ctx.Provider>
  );
}

function useEdit(path: string) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Edit fields need an EditProvider");
  return { change: (value: EditValue) => ctx.change(path, value), invalid: path in useContext(StatusCtx).fields };
}

/** Sticky bar: edit mode, unsaved changes, Save, discard, back to the page, restore the original. */
export function EditBar({ labels, viewHref, edited, reset, hidden }: {
  labels: EditLabels; viewHref: string; edited: boolean; reset: (fd: FormData) => Promise<void>; hidden?: ReactNode;
}) {
  const { s, count, error, save, discard } = useContext(StatusCtx);
  const text = {
    idle: "", dirty: labels.unsaved.replace("{n}", String(count)), saving: labels.saving, saved: labels.saved,
    error: error === "invalid" ? labels.invalid : labels.error,
  }[s];
  const dirty = count > 0;
  return (
    <div className="sticky top-2 z-40 mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-gold/40 bg-ink/95 px-4 py-3 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur">
      <span className="chip">{labels.mode}</span>
      <span className="text-[13px] text-muted">{labels.locale}</span>
      <span role="status" aria-live="polite" className={`text-sm ${s === "error" ? "text-rose" : s === "saved" ? "text-teal-light" : "text-gold"}`}>{text}</span>
      <span className="ms-auto flex flex-wrap gap-2">
        {edited && !dirty && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!confirm(labels.resetConfirm)) return;
            await reset(new FormData(e.currentTarget));
            window.location.reload(); // fields keep what was typed; reload to show the original
          }}>
            {hidden}
            <button type="submit" className="btn-ghost min-h-10! px-4! text-sm">{labels.reset}</button>
          </form>
        )}
        {dirty && (
          <button type="button" className="btn-ghost min-h-10! px-4! text-sm"
            onClick={() => { if (confirm(labels.discardConfirm)) discard(); }}>
            {labels.discard}
          </button>
        )}
        <button type="button" onClick={save} disabled={!dirty || s === "saving"} className="btn-gold min-h-10! px-5! text-sm disabled:opacity-40">
          {labels.save}
        </button>
        {!dirty && <a href={viewHref} className="btn-ghost min-h-10! px-4! text-sm">{labels.view}</a>}
      </span>
    </div>
  );
}

const EDITABLE = "rounded-md outline-1 outline-offset-4 outline-dashed outline-gold/45 hover:outline-gold focus:outline-2 focus:outline-solid focus:outline-gold cursor-text";
const INVALID = "outline-rose! border-rose!";

/** Text edited in place (titles, paragraphs). The DOM keeps what is typed; React only renders it once. */
export function EditText({ path, value, as: Tag = "span", className = "", label }: { path: string; value: string; as?: ElementType; className?: string; label: string }) {
  const { change, invalid } = useEdit(path);
  const [initial] = useState(value);
  return (
    <Tag
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      spellCheck
      aria-invalid={invalid || undefined}
      className={`${className} ${EDITABLE} ${invalid ? INVALID : ""}`}
      onInput={(e: React.FormEvent<HTMLElement>) => change(e.currentTarget.innerText)}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
    >
      {initial}
    </Tag>
  );
}

type FieldProps = { path: string; label: string; dir?: "rtl" | "ltr"; lang?: string };

export function EditField({ path, label, value, multiline = false, dir, lang }: FieldProps & { value: string; multiline?: boolean }) {
  const { change, invalid } = useEdit(path);
  const props = {
    defaultValue: value, dir, lang, className: `field ${invalid ? INVALID : ""}`, maxLength: 2000, "aria-invalid": invalid || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(e.target.value),
  };
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="label">{label}</span>
      {multiline ? <textarea rows={3} {...props} /> : <input {...props} />}
    </label>
  );
}

export function EditNumber({ path, label, value, min, max }: FieldProps & { value: number; min: number; max: number }) {
  const { change } = useEdit(path);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <input type="number" defaultValue={value} min={min} max={max} className="field w-24" dir="ltr"
        onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= min && n <= max) change(n); }} />
    </label>
  );
}

export function EditColor({ path, label, value }: FieldProps & { value: string }) {
  const { change } = useEdit(path);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <input type="color" defaultValue={value} className="h-11 w-16 cursor-pointer rounded-xl border border-line bg-transparent p-1" onChange={(e) => change(e.target.value)} />
    </label>
  );
}

export function EditSelect({ path, label, value, options }: FieldProps & { value: string; options: { value: string; label: string }[] }) {
  const { change } = useEdit(path);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <select defaultValue={value} className="field" onChange={(e) => change(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function EditChecks({ path, label, value, options }: FieldProps & { value: string[]; options: { value: string; label: string }[] }) {
  const { change } = useEdit(path);
  const [picked, setPicked] = useState(value);
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend className="label mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((o) => (
          <label key={o.value} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--color-gold)]" checked={picked.includes(o.value)}
              onChange={(e) => {
                const next = e.target.checked ? [...picked, o.value] : picked.filter((v) => v !== o.value);
                if (!next.length) return;
                setPicked(next);
                change(next);
              }} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
