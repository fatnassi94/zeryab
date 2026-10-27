import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { getDictionary, resolveLocale } from "@/i18n/server";
import { ProgramList } from "./programs/program-list";

export async function generateMetadata({ params }: PageProps<"/[lang]/library">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").libraryPage.title };
}

/** Library & archive: show programs first, then the members' recordings and archive (coming). */
export default async function LibraryPage({ params }: PageProps<"/[lang]/library">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.libraryPage;

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

      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        {[dict.pillars.recordings, dict.pillars.archive].map((p) => (
          <div key={p.title} className="card flex flex-col gap-2 p-6">
            <div className="flex flex-wrap gap-2">
              <span className="chip chip-teal">{t.soon}</span>
              <span className="chip">{t.membersOnly}</span>
            </div>
            <h2 className="m-0 font-display text-2xl font-semibold">{p.title}</h2>
            <p className="m-0 leading-[1.8] text-muted">{p.text}</p>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
