import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { PrivacyNote } from "@/components/privacy-note";
import { AuthForm } from "./auth-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").auth.loginTitle };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const mode = sp.mode === "signup" ? "signup" : "login";
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;

  if (await getViewer()) redirect(next ?? `/${locale}/members`);

  const toggle = new URLSearchParams();
  if (mode === "login") toggle.set("mode", "signup");
  if (next) toggle.set("next", next);
  const toggleQuery = toggle.toString();

  return (
    <PageShell locale={locale}>
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pt-6">
        <h1 className="m-0 font-display text-4xl font-semibold">
          {mode === "login" ? dict.auth.loginTitle : dict.auth.signupTitle}
        </h1>
        {next && <p className="m-0 rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3 text-[15px] text-soft">{dict.auth.signInFirst}</p>}
        <div className="card p-6 sm:p-8">
          <AuthForm mode={mode} locale={locale} next={next} labels={dict.auth} parts={dict.parts} />
          {mode === "login" && (
            <Link href={`/${locale}/forgot`} className="mt-4 inline-flex min-h-11 items-center text-sm">
              {dict.auth.forgot}
            </Link>
          )}
          {mode === "signup" && <PrivacyNote locale={locale} className="mt-4" />}
        </div>
        <Link href={`/${locale}/login${toggleQuery ? `?${toggleQuery}` : ""}`} className="text-center">
          {mode === "login" ? dict.auth.noAccount : dict.auth.haveAccount}
        </Link>
      </div>
    </PageShell>
  );
}
