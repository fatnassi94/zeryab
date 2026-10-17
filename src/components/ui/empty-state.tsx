import Link from "next/link";
import type { ReactNode } from "react";

/** A designed "nothing here yet": one line of guidance and, when useful, the next action. */
export function EmptyState({ title, text, action, icon }: {
  title: ReactNode;
  text?: ReactNode;
  action?: { href: string; label: ReactNode };
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-white/12 px-5 py-6">
      {icon && <span className="flex size-10 items-center justify-center rounded-full bg-gold/10 text-gold">{icon}</span>}
      <p className="m-0 font-medium text-soft">{title}</p>
      {text && <p className="m-0 text-sm leading-[1.8] text-muted">{text}</p>}
      {action && (
        <Link href={action.href} className="btn-ghost min-h-11! text-sm">
          {action.label}
        </Link>
      )}
    </div>
  );
}
