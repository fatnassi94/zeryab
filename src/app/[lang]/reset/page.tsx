import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { ResetForm } from "../forgot/forms";

export async function generateMetadata({ params }: PageProps<"/[lang]/reset">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").auth.resetTitle };
}

/** Reached from the reset email: /auth/confirm has already signed the user in. */
export default async function ResetPage({ params }: PageProps<"/[lang]/reset">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const viewer = await getViewer();

  return (
    <PageShell locale={locale}>
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pt-6">
        <h1 className="m-0 font-display text-4xl font-semibold">{dict.auth.resetTitle}</h1>
        <div className="card p-6 sm:p-8">
          {viewer ? (
            <ResetForm locale={locale} labels={dict.auth} />
          ) : (
            <div className="flex flex-col items-start gap-4">
              <p className="m-0 text-rose">{dict.auth.resetExpired}</p>
              <Link href={`/${locale}/forgot`} className="btn-gold">{dict.auth.forgot}</Link>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
