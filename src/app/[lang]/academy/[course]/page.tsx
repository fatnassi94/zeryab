import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { fill, formatNumber, getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { getCourseContent, type CourseItem } from "@/lib/courses";
import { courseProgress } from "@/lib/courses/progress";
import { getCourseProgress } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/server";

type Props = PageProps<"/[lang]/academy/[course]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { course } = await params;
  return { title: getCourseContent(course)?.title };
}

/** Course overview: progress and level, then every lesson, drill and the test with a done mark. */
export default async function CoursePage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { course: slug } = await params;
  const dict = getDictionary(locale);
  const t = dict.academy;
  const l = t.learn;
  const content = getCourseContent(slug);
  const supabase = await createClient();
  const { data: course } = content ? await supabase.from("courses").select("id, title, summary, description, level").eq("slug", slug).maybeSingle() : { data: null };

  if (!content || !course) notFound();

  const viewer = await getViewer();
  const progress = viewer ? (await getCourseProgress(slug, [viewer.id])).byUser.get(viewer.id)! : courseProgress(content, new Set(), null);
  const n = (v: number) => formatNumber(locale, v);
  const base = `/${locale}/academy/${slug}`;
  const doneSet = new Set(progress.completed);
  const started = progress.done > 0;
  const cta = progress.next ?? content.items[0].slug;

  const check = (item: CourseItem) =>
    doneSet.has(item.slug) ? (
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal text-teal-ink" aria-label={t.done}>✓</span>
    ) : (
      <span className="size-8 shrink-0 rounded-full border border-white/15" aria-hidden="true" />
    );
  const lessons = content.items.filter((i) => i.kind === "lesson");
  const drills = content.items.filter((i) => i.kind === "drill");
  const test = content.items.find((i) => i.kind === "test");

  return (
    <PageShell locale={locale} active="academy">
      <nav aria-label={t.breadcrumb} className="mb-6 flex flex-wrap gap-2 text-sm text-muted">
        <Link href={`/${locale}/academy`}>{t.title}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{course.title}</span>
      </nav>

      <div className="mb-10 flex flex-wrap items-stretch gap-6 rounded-[32px] panel-feature-dual p-6 sm:p-10">
        <div className="flex min-w-0 flex-[999_1_min(520px,100%)] flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="chip">{fill(t.level, { level: t.levels[course.level] })}</span>
            <span className="chip chip-teal">{fill(t.lessons, { n: n(lessons.length) })}</span>
          </div>
          <h1 lang="ar" className="m-0 font-display text-5xl leading-[1.15] font-bold sm:text-[64px]">{course.title}</h1>
          {course.summary && <p lang="ar" className="m-0 text-lg leading-[1.9] font-light text-soft">{course.summary}</p>}
          {course.description && <p lang="ar" className="m-0 leading-[1.9] text-muted">{course.description}</p>}
          {l.contentNote && <p className="m-0 text-sm text-muted">{l.contentNote}</p>}
        </div>
        <section aria-labelledby="progress-h" className="card flex flex-[1_1_min(280px,100%)] flex-col gap-4 p-6">
          <h2 id="progress-h" className="m-0 font-display text-xl font-semibold">{l.progress}</h2>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-5xl font-bold text-gold tabular-nums">{n(progress.percent)}٪</span>
            <span className="text-sm text-muted">{fill(l.itemsDone, { done: n(progress.done), total: n(progress.total) })}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={l.progress}>
            <div className="h-full rounded-full bg-gold" style={{ width: `${progress.percent}%` }} />
          </div>
          {viewer ? (
            <p className="m-0 text-[15px] text-soft">
              {l.yourLevel}: <strong className="text-text">{l.levels[progress.level]}</strong>
              {progress.testPercent !== null && <span className="block text-sm text-muted">{fill(l.testScore, { n: n(progress.testPercent) })}</span>}
            </p>
          ) : (
            <p className="m-0 text-sm text-muted">{l.signInToSave}</p>
          )}
          <Link href={`${base}/${cta}`} className="btn-gold mt-auto">{progress.next === null ? l.review : started ? l.continue : l.startCourse}</Link>
        </section>
      </div>

      <section aria-labelledby="lessons-h" className="mb-10 flex flex-col gap-4">
        <h2 id="lessons-h" className="m-0 font-display text-3xl font-semibold">{l.lessonsTitle}</h2>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {lessons.map((item, i) => (
            <li key={item.slug}>
              <Link href={`${base}/${item.slug}`} className="card flex items-center gap-4 p-4 text-text no-underline hover:border-gold/40 hover:text-text sm:p-5">
                <span className="w-8 shrink-0 text-center font-display text-2xl font-semibold text-gold">{n(i + 1)}</span>
                <span lang="ar" className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-lg font-semibold">{item.title}</span>
                  <span className="text-sm text-muted">{item.summary}</span>
                </span>
                {item.kind === "lesson" && <span className="hidden text-sm text-muted sm:inline">{fill(l.minutes, { n: n(item.minutes) })}</span>}
                {check(item)}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="drills-h" className="mb-10 flex flex-col gap-4">
        <h2 id="drills-h" className="m-0 font-display text-3xl font-semibold">{l.drillsTitle}</h2>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-2.5 p-0">
          {drills.map((item) => (
            <li key={item.slug}>
              <Link href={`${base}/${item.slug}`} className="card flex h-full items-center gap-3 p-4 text-text no-underline hover:border-gold/40 hover:text-text">
                <span lang="ar" className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-[13px] text-muted">{item.summary}</span>
                </span>
                {check(item)}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {test && (
        <section aria-labelledby="test-h" className="flex flex-col gap-4">
          <h2 id="test-h" className="m-0 font-display text-3xl font-semibold">{l.testTitle}</h2>
          <Link href={`${base}/${test.slug}`} className="panel-feature flex flex-wrap items-center gap-4 rounded-[24px] p-6 text-text no-underline hover:text-text">
            <span lang="ar" className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-display text-2xl font-semibold">{test.title}</span>
              <span className="text-soft">{test.summary}</span>
            </span>
            {progress.testPercent !== null && <span className="chip">{fill(l.testScore, { n: n(progress.testPercent) })}</span>}
            {check(test)}
          </Link>
        </section>
      )}
    </PageShell>
  );
}
