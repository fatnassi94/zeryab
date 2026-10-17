import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { ForgotForm } from "./forms";

export async function generateMetadata({ params }: PageProps<"/[lang]/forgot">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").auth.forgotTitle };
}

export default async function ForgotPage({ params }: PageProps<"/[lang]/forgot">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  return (
    <PageShell locale={locale}>
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pt-6">
        <h1 className="m-0 font-display text-4xl font-semibold">{dict.auth.forgotTitle}</h1>
        <p className="m-0 leading-[1.8] text-soft">{dict.auth.forgotText}</p>
        <div className="card p-6 sm:p-8">
          <ForgotForm locale={locale} labels={dict.auth} />
        </div>
        <Link href={`/${locale}/login`} className="text-center">{dict.auth.haveAccount}</Link>
      </div>
    </PageShell>
  );
}
