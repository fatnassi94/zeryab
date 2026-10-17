import type { ReactNode } from "react";

const tones = {
  success: { cls: "border-gold/30 bg-gold/10 text-gold", role: "status" },
  info: { cls: "border-teal/30 bg-teal/10 text-teal-light", role: "status" },
  error: { cls: "border-rose/40 bg-rose/10 text-rose", role: "alert" },
} as const;

/** Inline feedback after an action. Errors are announced immediately (role="alert"). */
export function Notice({ tone = "info", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const t = tones[tone];
  return (
    <p role={t.role} className={`m-0 rounded-2xl border px-[18px] py-3.5 text-[15px] leading-[1.8] ${t.cls}`}>
      {children}
    </p>
  );
}
