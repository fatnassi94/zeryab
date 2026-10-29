import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { hasLocale } from "@/i18n/config";
import { fill, formatDate, getDictionary, resolveLocale } from "@/i18n/server";
import { CLUB } from "@/lib/club";

/** Date of the text below; change it with the text. */
const UPDATED = "2026-10-29";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(hasLocale(lang) ? lang : "ar").privacy;
  return { title: t.title, description: t.intro };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).privacy;
  // Until the club sets a public email, people write through the club's management.
  const withEmail = (text: string) => {
    const [before, after] = text.split("{email}");
    if (after === undefined) return text;
    return <>{before}{CLUB.email ? <a href={`mailto:${CLUB.email}`} dir="ltr">{CLUB.email}</a> : t.contactFallback}{after}</>;
  };

  return (
    <PageShell locale={locale}>
      <article className="mx-auto flex max-w-[760px] flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 font-display text-5xl font-bold">{t.title}</h1>
          <p className="m-0 text-lg leading-[1.9] text-soft">{t.intro}</p>
          <p className="m-0 text-sm text-muted">{fill(t.updated, { date: formatDate(locale, UPDATED, { year: "numeric" }) })}</p>
        </header>

        <nav aria-label={t.contents} className="card p-5">
          <ol className="m-0 grid gap-x-6 gap-y-2 ps-5 text-[15px] sm:grid-cols-2">
            {t.sections.map((s, i) => (
              <li key={s.title}><a href={`#s-${i + 1}`}>{s.title}</a></li>
            ))}
          </ol>
        </nav>

        {t.sections.map((s, i) => (
          <section key={s.title} id={`s-${i + 1}`} aria-labelledby={`s-${i + 1}-h`} className="flex scroll-mt-24 flex-col gap-3">
            <h2 id={`s-${i + 1}-h`} className="m-0 font-display text-2xl font-semibold">
              <span className="text-gold">{i + 1}.</span> {s.title}
            </h2>
            {s.body.length === 1 ? (
              <p className="m-0 leading-[1.9] text-soft">{withEmail(s.body[0])}</p>
            ) : (
              <ul className="m-0 flex flex-col gap-2 ps-5 leading-[1.9] text-soft">
                {s.body.map((line) => <li key={line}>{withEmail(line)}</li>)}
              </ul>
            )}
          </section>
        ))}
      </article>
    </PageShell>
  );
}
