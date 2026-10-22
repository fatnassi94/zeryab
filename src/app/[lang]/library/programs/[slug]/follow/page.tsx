import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { fill, getDictionary, resolveLocale } from "@/i18n/server";
import { getProgram, pageSubject, programAsset } from "@/lib/programs";
import { Reader } from "./reader";

type Props = PageProps<"/[lang]/library/programs/[slug]/follow">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = hasLocale(lang) ? lang : "ar";
  const program = getProgram(slug);
  return program ? { title: `${program.title[locale]} · ${getDictionary(locale).programs.follow}` } : {};
}

/** Full-screen reader of a program's pages, for following while it is sung. */
export default async function FollowPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) notFound();
  const { p } = await searchParams;
  const total = program.pages.length;
  const asked = Number(typeof p === "string" ? p : undefined);
  const t = getDictionary(locale).programs;

  return (
    <Reader
      slug={program.slug}
      title={program.title[locale]}
      backHref={`/${locale}/library/programs/${program.slug}`}
      dir={locale === "ar" ? "rtl" : "ltr"}
      initial={Number.isInteger(asked) && asked >= 1 && asked <= total ? asked : 0}
      pages={program.pages.map((pg) => ({
        n: pg.n,
        src: programAsset.page(program.slug, pg.n),
        srcSm: programAsset.page(program.slug, pg.n, "sm"),
        alt: fill(t.pageAlt, { n: pg.n, total, what: pageSubject(program, pg, locale, t) }),
        illustrated: pg.illustrated,
        tableau: pg.tableau,
      }))}
      tableaux={program.tableaux.map((tb) => ({ n: tb.n, title: tb.title[locale], page: tb.page }))}
      labels={{
        exit: t.reader.exit, prev: t.reader.prev, next: t.reader.next, pageOf: t.reader.pageOf, jump: t.reader.jump,
        cover: t.cover, tableau: t.tableauLabel, dim: t.reader.dim, dimHint: t.reader.dimHint, zoomIn: t.reader.zoomIn,
        zoomOut: t.reader.zoomOut, awake: t.reader.awake, pages: t.reader.pages, pageLabel: t.reader.pageLabel, hint: t.reader.hint,
      }}
    />
  );
}
