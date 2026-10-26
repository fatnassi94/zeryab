import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JoinForm } from "./join-form";
import { Notice } from "@/components/ui/notice";

export async function generateMetadata({ params }: PageProps<"/[lang]/join">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").join.formTitle };
}

export default async function JoinPage({ params }: PageProps<"/[lang]/join">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const viewer = await getViewer();

  let body: ReactNode;
  if (!viewer) {
    body = (
      <div className="flex flex-col items-start gap-4">
        <p className="m-0 leading-[1.8] text-soft">{dict.join.needAccount}</p>
        <Link href={`/${locale}/login?mode=signup&next=${encodeURIComponent(`/${locale}/join`)}`} className="btn-gold">
          {dict.join.createAccount}
        </Link>
      </div>
    );
  } else if (viewer.isActive) {
    body = <Notice tone="success">{dict.join.member}</Notice>;
  } else {
    const supabase = await createClient();
    const { data: pending } = await supabase
      .from("membership_requests")
      .select("id")
      .eq("user_id", viewer.id)
      .eq("status", "pending")
      .limit(1);
    body = pending?.length ? (
      <Notice tone="info">{dict.join.pending}</Notice>
    ) : (
      <JoinForm locale={locale} defaultName={viewer.fullName} labels={{ ...dict.join, part: dict.auth.part }} parts={dict.parts} />
    );
  }

  return (
    <PageShell locale={locale} active="join">
      <div className="mx-auto flex max-w-[620px] flex-col gap-6 pt-6">
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-display text-4xl font-semibold sm:text-5xl">{dict.join.title}</h1>
          <p className="m-0 text-[17px] leading-[1.9] text-soft">{dict.join.text}</p>
        </div>
        <div className="card p-6 sm:p-8">{body}</div>
      </div>
    </PageShell>
  );
}
