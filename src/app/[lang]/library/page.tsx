import type { Metadata } from "next";
import Link from "next/link";
import { AudioButton } from "@/components/audio-button";
import { FileIcon } from "@/components/logo";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { formatDuration, mediaUrls } from "@/lib/data/media";
import { createClient } from "@/lib/supabase/server";
import { ProgramList } from "./programs/program-list";

export async function generateMetadata({ params }: PageProps<"/[lang]/library">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").libraryPage.title };
}

/** Library & archive: show programs first, then recordings and documents (RLS decides which the viewer sees). */
export default async function LibraryPage({ params }: PageProps<"/[lang]/library">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.libraryPage;
  const supabase = await createClient();
  const [viewer, { data: recs }, { data: docs }] = await Promise.all([
    getViewer(),
    supabase.from("recordings").select("id, title, performers, duration_seconds, visibility, storage_bucket, storage_path").eq("status", "published").order("created_at", { ascending: false }).limit(30),
    supabase.from("documents").select("id, title, kind, mime_type, visibility, storage_bucket, storage_path").eq("status", "published").order("created_at", { ascending: false }).limit(30),
  ]);
  const recordings = recs ?? [];
  const documents = docs ?? [];
  const urls = await mediaUrls([...recordings, ...documents]);
  const member = !!viewer?.isActive;
  const kinds = dict.admin.archive.library.kinds;

  return (
    <PageShell locale={locale} active="library">
      <div className="mb-12 flex max-w-[720px] flex-col gap-3">
        <h1 className="m-0 font-display text-5xl font-bold sm:text-6xl">{t.title}</h1>
        <p className="m-0 text-lg leading-[1.9] font-light text-soft">{t.intro}</p>
      </div>

      <section aria-labelledby="programs-h" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="programs-h" className="m-0 font-display text-3xl font-semibold sm:text-4xl">{dict.programs.title}</h2>
            <p className="m-0 text-muted">{t.programsIntro}</p>
          </div>
          <Link href={`/${locale}/library/programs`} className="text-sm">{t.allPrograms}</Link>
        </div>
        <ProgramList locale={locale} />
      </section>

      <div className="mt-14 grid items-start gap-4 lg:grid-cols-2">
        <section aria-labelledby="recs-h" className="card flex flex-col gap-1.5 p-6">
          <h2 id="recs-h" className="m-0 font-display text-2xl font-semibold">{dict.pillars.recordings.title}</h2>
          <p className="m-0 mb-2 leading-[1.8] text-muted">{dict.pillars.recordings.text}</p>
          {recordings.length === 0 && <EmptyState title={t.noRecordings} />}
          {recordings.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-t border-white/7 py-2.5">
              <AudioButton src={urls.get(r.storage_path)} label={`${dict.members.play}: ${r.title}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate">{r.title}</span>
                <span className="text-[13px] text-muted">{[r.performers, formatDuration(r.duration_seconds)].filter(Boolean).join(" · ")}</span>
              </div>
              {r.visibility !== "public" && <span className="chip text-xs!">{t.membersOnly}</span>}
            </div>
          ))}
        </section>

        <section aria-labelledby="docs-h" className="card flex flex-col gap-1.5 p-6">
          <h2 id="docs-h" className="m-0 font-display text-2xl font-semibold">{dict.pillars.archive.title}</h2>
          <p className="m-0 mb-2 leading-[1.8] text-muted">{dict.pillars.archive.text}</p>
          {documents.length === 0 && <EmptyState title={t.noDocuments} />}
          {documents.map((d) => (
            <a key={d.id} href={urls.get(d.storage_path)} target="_blank" rel="noopener" className="flex min-h-12 items-center gap-3 border-t border-white/7 py-1.5 text-text no-underline hover:text-gold">
              <FileIcon />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{d.title}</span>
                <span className="text-[13px] text-muted">{kinds[d.kind]}</span>
              </span>
              {d.visibility !== "public" && <span className="chip text-xs!">{t.membersOnly}</span>}
            </a>
          ))}
        </section>
      </div>

      {!member && (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-muted">
          {t.membersMore}
          <Link href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/library`)}`} className="btn-ghost min-h-10! px-4! text-sm">{dict.library.login}</Link>
        </p>
      )}
    </PageShell>
  );
}
