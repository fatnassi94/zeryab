import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { ProgramIcon } from "@/components/program-icon";
import { hasLocale } from "@/i18n/config";
import { fill, getDictionary, resolveLocale } from "@/i18n/server";
import { getProgram, PAGE_SIZE, pageSubject, programAsset, programSongs } from "@/lib/programs";
import { Necklace } from "./necklace";
import { RouteMap } from "./route-map";

type Props = PageProps<"/[lang]/library/programs/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = hasLocale(lang) ? lang : "ar";
  const program = getProgram(slug);
  return program ? { title: program.title[locale], description: program.summary[locale] } : {};
}

export default async function ProgramPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) notFound();
  const dict = getDictionary(locale);
  const t = dict.programs;
  const base = `/${locale}/library/programs`;
  const follow = `${base}/${program.slug}/follow`;
  const songs = programSongs(program);
  const total = program.pages.length;
  const arabicTitle = locale === "ar" ? {} : { lang: "ar", dir: "rtl" as const };

  return (
    <PageShell locale={locale} active="library">
      <nav aria-label={dict.academy.breadcrumb} className="mb-4 flex flex-wrap gap-2 text-sm text-muted">
        <Link href={`/${locale}/library`}>{dict.nav.library}</Link>
        <span aria-hidden="true">›</span>
        <Link href={base}>{t.title}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{program.title[locale]}</span>
      </nav>

      <header className="flex max-w-[780px] flex-col gap-4">
        <p className="m-0 text-sm text-gold">{program.series[locale]} · <bdi>{program.orbit[locale]}</bdi></p>
        <h1 className="m-0 font-display text-5xl font-bold sm:text-7xl">{program.title[locale]}</h1>
        <p className="m-0 text-lg leading-[1.9] font-light text-soft">{program.summary[locale]}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={follow} className="btn-gold">{t.follow}</Link>
          <a href={programAsset.pdf(program.slug)} download className="btn-ghost">
            {fill(t.download, { size: `${(program.pdfBytes / 1e6).toFixed(1)} MB` })}
          </a>
        </div>
        <p className="m-0 text-sm text-muted">
          {fill(t.stats, { tableaux: program.tableaux.length, songs: songs.length, pages: total })}
        </p>
      </header>

      <section aria-labelledby="idea-h" className="mt-16 flex flex-col gap-6">
        <h2 id="idea-h" className="m-0 font-display text-3xl font-semibold sm:text-4xl">{t.ideaTitle}</h2>
        <Necklace
          songs={songs.map((s) => ({ n: s.n, title: s.title, page: s.page, color: s.tableau.color }))}
          tableaux={program.tableaux.map((tb) => ({
            n: tb.n, title: tb.title[locale], color: tb.color, icon: tb.icon, page: tb.page,
            first: tb.songs[0].n, last: tb.songs[tb.songs.length - 1].n,
          }))}
          centre={program.centre[locale]}
          steps={program.steps[locale]}
          dir={locale === "ar" ? "rtl" : "ltr"}
          labels={{
            play: t.play, pause: t.pause, replay: t.replay, next: t.nextStep, stepOf: t.stepOf,
            beadLabel: t.beadLabel, tableauLabel: t.tableauLabel, hint: t.ideaHint,
          }}
        />
      </section>

      <section aria-labelledby="map-h" className="mt-20 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 id="map-h" className="m-0 font-display text-3xl font-semibold sm:text-4xl">{t.mapTitle}</h2>
          <p className="m-0 text-muted">{t.mapIntro}</p>
        </div>
        <RouteMap
          dir={locale === "ar" ? "rtl" : "ltr"}
          stops={program.tableaux.map((tb) => ({
            ...tb.stop, n: tb.n, placeName: tb.stop.name[locale], title: tb.title[locale], color: tb.color,
            image: programAsset.tableau(program.slug, tb.n), page: tb.page, songs: tb.songs.map((s) => ({ n: s.n, title: s.title })),
          }))}
          labels={{
            ...t.map, tableau: t.tableauLabel,
            onward: program.next ? fill(t.next, { title: program.next[locale] }) : "",
          }}
        />
      </section>

      <section aria-labelledby="text-h" className="mt-20 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 id="text-h" className="m-0 font-display text-3xl font-semibold sm:text-4xl">{t.fullText}</h2>
          <p className="m-0 max-w-[640px] leading-[1.8] text-muted">{fill(t.fullTextHint, { pages: total })}</p>
        </div>
        <nav aria-label={t.contents} className="flex flex-wrap gap-2">
          <a href="#page-1" className="chip min-h-11 no-underline">{t.cover}</a>
          {program.tableaux.map((tb) => (
            <a key={tb.n} href={`#page-${tb.page}`} className="chip min-h-11 gap-2 no-underline">
              <ProgramIcon name={tb.icon} size={18} className="shrink-0" />
              <span>{tb.n}. {tb.title[locale]}</span>
              <span className="text-faint">{fill(t.pageShort, { n: tb.page })}</span>
            </a>
          ))}
        </nav>
        <ol className="m-0 flex list-none flex-col items-center gap-10 p-0">
          {program.pages.map((pg) => {
            const subject = pageSubject(program, pg, locale, t);
            const starting = songs.filter((s) => s.page === pg.n);
            return (
              <li key={pg.n} id={`page-${pg.n}`} className="flex w-full max-w-[820px] flex-col gap-3">
                <Link href={`${follow}?p=${pg.n}`} aria-label={fill(t.openPage, { n: pg.n })}
                  className="block overflow-hidden rounded-[6px] bg-white shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10 hover:ring-gold/60">
                  {/* Pre-rendered static pages with their own srcset: nothing for the image optimizer to add. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={programAsset.page(program.slug, pg.n)}
                    srcSet={`${programAsset.page(program.slug, pg.n, "sm")} 800w, ${programAsset.page(program.slug, pg.n)} 1600w`}
                    sizes="(min-width: 900px) 820px, 100vw"
                    width={PAGE_SIZE.width}
                    height={PAGE_SIZE.height}
                    alt={fill(t.pageAlt, { n: pg.n, total, what: subject })}
                    loading={pg.n > 1 ? "lazy" : undefined}
                    decoding="async"
                    className="block h-auto w-full"
                  />
                </Link>
                <p className="m-0 flex flex-wrap items-center justify-between gap-2 text-sm text-faint">
                  <span>{fill(t.pageShort, { n: pg.n })} · {subject}</span>
                  {starting.length > 0 && (
                    <span className="flex flex-wrap gap-x-3">
                      {starting.map((s) => (
                        <bdi key={s.n} {...arabicTitle}>{s.n}. {s.title}</bdi>
                      ))}
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {program.next && (
        <p className="mt-16 text-center text-muted">{fill(t.next, { title: program.next[locale] })}</p>
      )}
    </PageShell>
  );
}
