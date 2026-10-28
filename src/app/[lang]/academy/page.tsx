import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { fill, formatNumber, getDictionary, resolveLocale } from "@/i18n/server";
import { contentLang, getTranslations, localize } from "@/lib/data/i18n";
import { maqamName } from "@/lib/data/maqamat";
import { listClubSongs } from "@/lib/data/scores";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata({ params }: PageProps<"/[lang]/academy">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").academy.title };
}

export default async function AcademyPage({ params }: PageProps<"/[lang]/academy">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const [courseRes, maqamRes, songs] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, summary, level, visibility, lessons(id, slug, position, status)")
      .eq("status", "published")
      .order("position"),
    supabase.from("maqamat").select("id, slug, name, family, description").eq("status", "published").order("position"),
    listClubSongs(),
  ]);
  // Songs the viewer may open, counted per maqam.
  const examples = new Map<string, number>();
  for (const s of songs) if (s.maqam) examples.set(s.maqam, (examples.get(s.maqam) ?? 0) + 1);

  const rawCourses = courseRes.data ?? [];
  const courses = localize(rawCourses, await getTranslations("courses", rawCourses.map((c) => c.id), locale));
  const rawMaqamat = maqamRes.data ?? [];
  const maqamat = localize(rawMaqamat, await getTranslations("maqamat", rawMaqamat.map((m) => m.id), locale));

  return (
    <PageShell locale={locale} active="academy">
      <div className="flex flex-col gap-3 pb-10">
        <h1 className="m-0 font-display text-5xl font-bold sm:text-[72px]">{dict.academy.title}</h1>
        <p className="m-0 max-w-[720px] text-lg leading-[1.9] font-light text-soft">{dict.academy.intro}</p>
      </div>

      <Link
        href={`/${locale}/academy/studio`}
        className="reveal group panel-feature mb-14 flex flex-wrap items-center justify-between gap-6 rounded-[28px] p-6 text-text no-underline hover:text-text sm:p-8"
      >
        <div className="flex max-w-[640px] flex-col gap-2">
          <span className="font-display text-3xl font-semibold">{dict.studio.title}</span>
          <span className="leading-[1.8] text-soft">{dict.studio.cardText}</span>
        </div>
        <span className="btn-gold">{dict.studio.open}</span>
      </Link>

      <section aria-labelledby="courses-h" className="flex flex-col gap-5 pb-14">
        <h2 id="courses-h" className="m-0 font-display text-3xl font-semibold">{dict.academy.courses}</h2>
        {courses.length === 0 ? (
          <EmptyState title={dict.academy.noCourses} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
            {courses.map((c) => {
              const lessons = (c.lessons ?? []).filter((l) => l.status === "published").sort((a, b) => a.position - b.position);
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/academy/${c.slug}`}
                  className="card flex flex-col gap-4 p-7 text-text no-underline hover:border-gold/40 hover:text-text"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">{fill(dict.academy.level, { level: dict.academy.levels[c.level] })}</span>
                    <span className="chip chip-teal">{fill(dict.academy.lessons, { n: formatNumber(locale, lessons.length) })}</span>
                  </div>
                  <h3 className="m-0 font-display text-[26px] font-semibold" {...contentLang(c, "title", locale)}>{c.title}</h3>
                  {c.summary && <p className="m-0 text-[15px] leading-[1.8] text-muted" {...contentLang(c, "summary", locale)}>{c.summary}</p>}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="maq-h" className="flex flex-col gap-5">
        <h2 id="maq-h" className="m-0 font-display text-3xl font-semibold">{dict.academy.maqamat}</h2>
        {maqamat.length === 0 ? (
          <EmptyState title={dict.academy.noMaqamat} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
            {maqamat.map((m) => {
              const name = maqamName(m, locale);
              const n = examples.get(m.slug) ?? 0;
              return (
                <Link
                  key={m.id}
                  href={`/${locale}/academy/maqamat/${m.slug}`}
                  className="card flex flex-col gap-2 p-5 text-text no-underline hover:border-gold/40 hover:text-text"
                >
                  <span className="font-display text-2xl font-semibold text-gold" {...name.attrs}>{name.text}</span>
                  {m.family && m.family !== m.name && <span className="text-sm text-muted" {...contentLang(m, "family", locale)}>{m.family}</span>}
                  {n > 0 && <span className="chip chip-teal self-start">{fill(dict.academy.examplesCount, { n: formatNumber(locale, n) })}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
