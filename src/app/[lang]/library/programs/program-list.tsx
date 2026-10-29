import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { fill, getDictionary } from "@/i18n/server";
import { loadPrograms } from "@/lib/data/programs";
import { programAsset, programSongs } from "@/lib/programs";

/** Cards for the show programs (used on the library page and the programs list). */
export async function ProgramList({ locale }: { locale: Locale }) {
  const programs = await loadPrograms();
  const t = getDictionary(locale).programs;
  const base = `/${locale}/library/programs`;
  return (
    <ul className="m-0 flex list-none flex-col gap-5 p-0">
      {programs.map((p) => (
        <li key={p.slug} className="card grid gap-6 p-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:p-6">
          <Link href={`${base}/${p.slug}`} className="block overflow-hidden rounded-[6px] bg-white ring-1 ring-white/10" tabIndex={-1} aria-hidden="true">
            {/* Pre-rendered page of the program: static file, no optimizer needed. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={programAsset.page(p.slug, p.tableaux[0].page, "sm")} alt="" width={800} height={1131} loading="lazy" className="block h-auto w-full" />
          </Link>
          <div className="flex min-w-0 flex-col gap-3">
            <p className="m-0 text-sm text-gold">{p.series[locale]} · <bdi>{p.orbit[locale]}</bdi></p>
            <h2 className="m-0 font-display text-3xl font-semibold sm:text-4xl">
              <Link href={`${base}/${p.slug}`} className="text-text no-underline hover:text-gold-light">{p.title[locale]}</Link>
            </h2>
            <p className="m-0 leading-[1.9] text-soft">{p.summary[locale]}</p>
            <p className="m-0 text-sm text-muted">{fill(t.stats, { tableaux: p.tableaux.length, songs: programSongs(p).length, pages: p.pages.length })}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link href={`${base}/${p.slug}`} className="btn-gold">{t.open}</Link>
              <Link href={`${base}/${p.slug}/follow`} className="btn-ghost">{t.follow}</Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
