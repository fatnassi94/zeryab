import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Common = { id: string; label: ReactNode; hint?: ReactNode; error?: ReactNode };

/** Label, hint and error wired to the control with ids (aria-describedby / aria-invalid). */
function FieldShell({ id, label, hint, error, children }: Common & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <span id={`${id}-hint`} className="text-[13px] text-muted">{hint}</span>}
      {error && <span id={`${id}-error`} className="text-[13px] text-rose">{error}</span>}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextField({ id, label, hint, error, className = "", ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={error ? true : undefined}
        className={`field ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({ id, label, hint, error, className = "", ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={3}
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={error ? true : undefined}
        className={`field ${className}`}
        {...props}
      />
    </FieldShell>
  );
}
