"use client";

import type { ReactNode } from "react";

/** Submit button that asks first (for deletions inside a server form). */
export function ConfirmButton({ message, className = "", children }: { message: string; className?: string; children: ReactNode }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
