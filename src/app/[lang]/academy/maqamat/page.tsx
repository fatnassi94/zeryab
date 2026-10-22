import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/academy/maqamat">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").soon.maqamatTitle };
}

export default async function MaqamatPage({ params }: PageProps<"/[lang]/academy/maqamat">) {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).soon;
  return (
    <PageShell locale={locale} active="academy">
      <ComingSoon label={t.label} title={t.maqamatTitle} text={t.maqamatText} back={{ href: `/${locale}/academy#maq-h`, label: t.back }} />
    </PageShell>
  );
}
