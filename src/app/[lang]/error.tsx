"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import ar from "@/i18n/dictionaries/ar";
import en from "@/i18n/dictionaries/en";
import fr from "@/i18n/dictionaries/fr";

const dictionaries = { ar, fr, en };

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const params = useParams<{ lang: string }>();
  const locale = hasLocale(params.lang) ? params.lang : "ar";
  const t = dictionaries[locale].common;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-center justify-center gap-5 px-4 py-20 text-center">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-rose/12 text-rose">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 8v5M12 16.5v.5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <h1 className="m-0 font-display text-3xl font-semibold">{t.errorTitle}</h1>
      <p role="alert" className="m-0 leading-[1.8] text-soft">{t.errorText}</p>
      {error.digest && <p className="m-0 text-xs text-faint" dir="ltr">ref: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn-gold">{t.retry}</button>
        <Link href={`/${locale}`} className="btn-ghost">{t.backHome}</Link>
      </div>
    </main>
  );
}
