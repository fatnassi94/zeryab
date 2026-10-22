import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { ProgramList } from "./program-list";

export async function generateMetadata({ params }: PageProps<"/[lang]/library/programs">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").programs.title };
}

/** The group's show programs: each one explained, then readable while it is sung. */
export default async function ProgramsPage({ params }: PageProps<"/[lang]/library/programs">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.programs;

  return (
    <PageShell locale={locale} active="library">
      <nav aria-label={dict.academy.breadcrumb} className="mb-4 flex gap-2 text-sm text-muted">
        <Link href={`/${locale}/library`}>{dict.nav.library}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{t.title}</span>
      </nav>
      <div className="mb-10 flex max-w-[720px] flex-col gap-3">
        <h1 className="m-0 font-display text-5xl font-bold sm:text-6xl">{t.title}</h1>
        <p className="m-0 text-lg leading-[1.9] font-light text-soft">{t.intro}</p>
      </div>
      <ProgramList locale={locale} />
    </PageShell>
  );
}
