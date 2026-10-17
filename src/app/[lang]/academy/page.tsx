import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { fill, formatNumber, getDictionary, resolveLocale } from "@/i18n/server";
import { contentLang, getTranslations, localize } from "@/lib/data/i18n";
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

  const [courseRes, maqamRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, summary, level, visibility, lessons(id, slug, position, status)")
      .eq("status", "published")
      .order("position"),
    supabase.from("maqamat").select("id, slug, name, family, description").eq("status", "published").order("position"),
  ]);

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

      <section aria-labelledby="courses-h" className="flex flex-col gap-5 pb-14">
        <h2 id="courses-h" className="m-0 font-display text-3xl font-semibold">{dict.academy.courses}</h2>
        {courses.length === 0 ? (
          <EmptyState title={dict.academy.noCourses} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
            {courses.map((c) => {
              const lessons = (c.lessons ?? []).filter((l) => l.status === "published").sort((a, b) => a.position - b.position);
              const first = lessons[0];
              return (
                <Link
                  key={c.id}
                  href={first ? `/${locale}/academy/${c.slug}/${first.slug}` : `/${locale}/academy`}
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
            {maqamat.map((m) => (
              <div key={m.id} className="card flex flex-col gap-2 p-5">
                <span className="font-display text-2xl font-semibold text-gold" {...contentLang(m, "name", locale)}>{m.name}</span>
                {m.family && <span className="text-sm text-muted">{m.family}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
