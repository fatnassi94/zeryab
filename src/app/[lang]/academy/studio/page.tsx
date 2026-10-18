import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { isTranscriptionConfigured } from "@/lib/ai/transcribe";
import { getViewer } from "@/lib/auth";
import { listClubSongs } from "@/lib/data/scores";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { Studio } from "./studio";

export async function generateMetadata({ params }: PageProps<"/[lang]/academy/studio">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").studio.title };
}

export default async function StudioPage({ params }: PageProps<"/[lang]/academy/studio">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const [viewer, songs] = await Promise.all([getViewer(), listClubSongs()]);
  const club = {
    songs,
    canManage: !!viewer?.has("librarian"),
    canTranscribe: !!viewer?.isAdmin,
    // Only a yes/no reaches the browser, never the key.
    transcriptionReady: !!viewer?.isAdmin && isTranscriptionConfigured(),
  };
  return (
    <PageShell locale={locale} active="academy">
      <nav aria-label={dict.academy.breadcrumb} className="mb-4 flex gap-2 text-sm text-muted">
        <Link href={`/${locale}/academy`}>{dict.academy.title}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{dict.studio.title}</span>
      </nav>
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="m-0 font-display text-4xl font-bold sm:text-6xl">{dict.studio.title}</h1>
        <p className="m-0 max-w-[720px] text-lg leading-[1.9] font-light text-soft">{dict.studio.intro}</p>
      </div>
      <Studio locale={locale} labels={dict.studio} club={club} />
    </PageShell>
  );
}
