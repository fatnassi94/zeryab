"use client";

import { useOptimistic, useTransition } from "react";
import { setRsvp } from "./actions";

type Response = "yes" | "maybe" | "no";

export function RsvpButtons({ eventId, locale, initial, labels }: {
  eventId: string;
  locale: string;
  initial: Response | null;
  labels: { group: string; yes: string; maybe: string; no: string; status: Record<Response | "none", string> };
}) {
  const [value, setOptimistic] = useOptimistic<Response | null, Response>(initial, (_, next) => next);
  const [, startTransition] = useTransition();

  const choose = (r: Response) =>
    startTransition(async () => {
      setOptimistic(r);
      await setRsvp(eventId, r, locale);
    });

  return (
    <div className="flex flex-col items-start gap-2.5">
      <span className="text-sm font-medium">{labels.group}</span>
      <div role="group" aria-label={labels.group} className="flex flex-wrap gap-2">
        {(["yes", "maybe", "no"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => choose(r)}
            aria-pressed={value === r}
            className={`min-h-[46px] rounded-full px-5 text-[15px] font-medium ${
              value === r ? "border border-gold bg-gold text-gold-ink" : "border border-white/18 bg-transparent text-text"
            }`}
          >
            {labels[r]}
          </button>
        ))}
      </div>
      <span role="status" className="text-[13px] text-muted">{labels.status[value ?? "none"]}</span>
    </div>
  );
}
