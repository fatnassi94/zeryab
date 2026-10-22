import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/academy/[course]">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").soon.courseTitle };
}

export default async function CoursePage({ params }: PageProps<"/[lang]/academy/[course]">) {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).soon;
  return (
    <PageShell locale={locale} active="academy">
      <ComingSoon label={t.label} title={t.courseTitle} text={t.courseText} back={{ href: `/${locale}/academy`, label: t.back }} />
    </PageShell>
  );
}
