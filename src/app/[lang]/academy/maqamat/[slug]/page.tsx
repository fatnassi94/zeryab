import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { hasLocale, type Locale } from "@/i18n/config";
import { fill, getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { contentLang, getTranslations, localize } from "@/lib/data/i18n";
import { maqamName } from "@/lib/data/maqamat";
import { listClubSongs } from "@/lib/data/scores";
import { createClient } from "@/lib/supabase/server";

type Props = PageProps<"/[lang]/academy/maqamat/[slug]">;

const loadMaqam = cache(async (slug: string, locale: Locale) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maqamat")
    .select("id, slug, name, family, description")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  return localize([data], await getTranslations("maqamat", [data.id], locale))[0];
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = hasLocale(lang) ? lang : "ar";
  const maqam = await loadMaqam(slug, locale);
  return { title: maqam ? fill(getDictionary(locale).academy.maqamTitle, { name: maqamName(maqam, locale).text }) : undefined };
}

/** One maqam and the club's songs filed under it; each opens in the lab's animated reading. */
export default async function MaqamPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const dict = getDictionary(locale);
  const t = dict.academy;
  const maqam = await loadMaqam(slug, locale);
  if (!maqam) notFound();
  const [songs, viewer] = await Promise.all([listClubSongs({ maqamId: maqam.id }), getViewer()]);
  const name = maqamName(maqam, locale);
  const here = `/${locale}/academy/maqamat/${maqam.slug}`;

  return (
    <PageShell locale={locale} active="academy">
      <nav aria-label={t.breadcrumb} className="mb-4 flex flex-wrap gap-2 text-sm text-muted">
        <Link href={`/${locale}/academy`}>{t.title}</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/${locale}/academy#maq-h`}>{t.maqamat}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page" {...name.attrs}>{name.text}</span>
      </nav>
      <div className="mb-10 flex flex-col gap-3">
        <h1 className="m-0 font-display text-4xl font-bold sm:text-6xl">
          {fill(t.maqamTitle, { name: name.text })}
        </h1>
        {maqam.family && maqam.family !== maqam.name && (
          <p className="m-0 text-muted" {...contentLang(maqam, "family", locale)}>{maqam.family}</p>
        )}
        {maqam.description && (
          <p className="m-0 max-w-[720px] text-lg leading-[1.9] font-light text-soft" {...contentLang(maqam, "description", locale)}>
            {maqam.description}
          </p>
        )}
      </div>

      <section aria-labelledby="examples-h" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="examples-h" className="m-0 font-display text-3xl font-semibold">{t.examples}</h2>
          {songs.length > 0 && <p className="m-0 leading-[1.8] text-soft">{t.examplesIntro}</p>}
        </div>
        {songs.length === 0 ? (
          viewer ? (
            <EmptyState title={t.noExamples} action={{ href: `/${locale}/academy/studio`, label: dict.studio.open }} />
          ) : (
            <EmptyState title={t.examplesSignIn} action={{ href: `/${locale}/login?next=${encodeURIComponent(here)}`, label: dict.auth.login }} />
          )
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4 p-0">
            {songs.map((s) => (
              <li key={s.id} className="flex">
                <Link
                  href={`/${locale}/academy/studio?song=${s.id}`}
                  className="card flex flex-1 flex-col gap-3 p-6 text-text no-underline hover:border-gold/40 hover:text-text"
                >
                  <span className="font-display text-2xl font-semibold"><bdi>{s.title}</bdi></span>
                  {s.composer && <span className="text-sm text-muted"><bdi>{s.composer}</bdi></span>}
                  {s.status === "draft" && <span className="chip self-start bg-rose/15! text-rose!">{dict.studio.draft}</span>}
                  <span className="btn-gold mt-auto self-start">{t.readListen}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
