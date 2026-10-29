import type { Metadata } from "next";
import Link from "next/link";
import { hasLocale } from "@/i18n/config";
import { fill, formatDate, getDictionary, resolveLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth";
import { getProgramEdits, loadPrograms } from "@/lib/data/programs";
import { programAsset, programSongs } from "@/lib/programs";

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/archive">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.archive.title };
}

/** Archive back office: the show programs, each title opening its page in edit mode. */
export default async function ArchiveAdminPage({ params }: PageProps<"/[lang]/admin/archive">) {
  const locale = await resolveLocale(params);
  await requireRole(locale, ["librarian"]);
  const dict = getDictionary(locale);
  const t = dict.admin.archive;
  const [programs, edits] = await Promise.all([loadPrograms(), getProgramEdits()]);
  const base = `/${locale}/library/programs`;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{t.title}</h1>
        <p className="m-0 max-w-[720px] text-muted">{t.intro}</p>
      </div>

      <section aria-labelledby="programs-h" className="card flex flex-col gap-4 p-6">
        <h2 id="programs-h" className="m-0 font-display text-[22px] font-semibold">{t.programs}</h2>
        <ul className="m-0 flex list-none flex-col p-0">
          {programs.map((p) => {
            const row = edits.get(p.slug);
            const changed = row && Object.keys(row.edits).length > 0;
            return (
              <li key={p.slug} className="flex flex-wrap items-center gap-4 border-b border-white/6 py-4 last:border-0">
                {/* Pre-rendered page of the program: static file, no optimizer needed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={programAsset.page(p.slug, 1, "sm")} alt="" width={800} height={1131} loading="lazy" className="h-auto w-14 shrink-0 rounded-[4px] bg-white" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[13px] text-gold">{p.series[locale]}</span>
                  <Link href={`${base}/${p.slug}?edit=1`} className="font-display text-2xl font-semibold text-text no-underline hover:text-gold-light">
                    {p.title[locale]}
                  </Link>
                  <span className="text-[13px] text-muted">
                    {fill(dict.programs.stats, { tableaux: p.tableaux.length, songs: programSongs(p).length, pages: p.pages.length })}
                    {" · "}
                    {changed ? fill(t.edited, { date: formatDate(locale, row.updatedAt) }) : t.original}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`${base}/${p.slug}?edit=1`} className="btn-gold min-h-10! px-4!">{t.edit}</Link>
                  <Link href={`${base}/${p.slug}`} className="btn-ghost min-h-10! px-4!">{t.view}</Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
