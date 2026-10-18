import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { isTranscriptionConfigured } from "@/lib/ai/transcribe";
import { getViewer } from "@/lib/auth";
import { inboxCount } from "@/lib/data/inbox";
import { listClubSongs, listMaqamOptions } from "@/lib/data/scores";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { Studio } from "./studio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/[lang]/academy/studio">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").studio.title };
}

export default async function StudioPage({ params, searchParams }: PageProps<"/[lang]/academy/studio">) {
  const locale = await resolveLocale(params);
  // Direct link to one club song: /ar/academy/studio?song=<id>
  const { song } = await searchParams;
  const openSongId = typeof song === "string" && UUID.test(song) ? song : null;
  const dict = getDictionary(locale);
  const [viewer, songs, maqamat] = await Promise.all([getViewer(), listClubSongs(), listMaqamOptions()]);
  const club = {
    songs,
    maqamat,
    inboxCount: viewer?.isAdmin ? await inboxCount() : 0,
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
      <Studio
        locale={locale}
        labels={dict.studio}
        club={club}
        openSongId={openSongId}
        // Members-only songs are invisible to visitors: offer to sign in and come back to the song.
        signInHref={openSongId && !viewer ? `/${locale}/login?next=${encodeURIComponent(`/${locale}/academy/studio?song=${openSongId}`)}` : null}
      />
    </PageShell>
  );
}
