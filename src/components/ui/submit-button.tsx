"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Form submit button that shows progress while its form's action runs. */
export function SubmitButton({ children, variant = "gold", className = "" }: {
  children: ReactNode;
  variant?: "gold" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`${variant === "gold" ? "btn-gold" : "btn-ghost"} min-h-[50px]! ${className}`}
    >
      {pending && (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="zr-spin">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
