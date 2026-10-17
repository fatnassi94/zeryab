import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioButton } from "@/components/audio-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { intlLocale } from "@/i18n/config";
import { fill, formatNumber, getDictionary, resolveLocale } from "@/i18n/server";
import { getViewer } from "@/lib/auth";
import { contentLang, getTranslations, localize } from "@/lib/data/i18n";
import { formatDuration, mediaUrls } from "@/lib/data/media";
import { createClient } from "@/lib/supabase/server";
import { markLessonDone } from "../../actions";
import { Quiz } from "./quiz";
import { MetaLine } from "@/components/meta-line";

type Props = PageProps<"/[lang]/academy/[course]/[lesson]">;

/** Place each jins on the scale grid: explicit `start`, else right after the previous one. */
function layoutAjnas(ajnas: { name: string; notes?: number; start?: number }[], length: number) {
  const bands: { name: string; start: number; span: number }[] = [];
  for (const j of ajnas) {
    const prev = bands[bands.length - 1];
    const start = Math.min(j.start ?? (prev ? prev.start + prev.span : 0), Math.max(0, length - 1));
    const span = Math.max(1, Math.min(j.notes ?? length - start, length - start));
    bands.push({ name: j.name, start, span });
  }
  return bands;
}

async function load(courseSlug: string, lessonSlug: string) {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, level, course_teachers(profiles(full_name, display_name)), lessons(id, slug, title, position, status)")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return null;

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, slug, title, summary, objectives, body, level, position, maqam_id, maqamat(name, scale_notes, ajnas, description), lesson_prerequisites!lesson_prerequisites_lesson_id_fkey(lessons!lesson_prerequisites_required_lesson_id_fkey(title))",
    )
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .maybeSingle();
  return { supabase, course, lesson };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { course, lesson } = await params;
  const data = await load(course, lesson);
  return { title: data?.lesson?.title };
}

export default async function LessonPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const dict = getDictionary(locale);
  const t = dict.academy;
  const base = `/${locale}`;

  const data = await load(courseSlug, lessonSlug);
  if (!data) notFound();
  const { supabase, course } = data;
  const viewer = await getViewer();

  const outline = (course.lessons ?? []).filter((l) => l.status === "published" || l.slug === lessonSlug).sort((a, b) => a.position - b.position);

  // RLS hides the lesson when the viewer may not read it (e.g. not enrolled).
  if (!data.lesson) {
    return (
      <>
        <SiteHeader locale={locale} active="academy" />
        <main className="mx-auto max-w-[760px] px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-3xl font-semibold">{course.title}</h1>
          <p className="text-soft">{t.locked}</p>
          <Link href={viewer ? `${base}/academy` : `${base}/login?next=${encodeURIComponent(`${base}/academy/${courseSlug}/${lessonSlug}`)}`} className="btn-gold">
            {viewer ? t.title : dict.nav.login}
          </Link>
        </main>
        <SiteFooter locale={locale} />
      </>
    );
  }

  const tr = await getTranslations("lessons", [data.lesson.id], locale);
  const [lesson] = localize([data.lesson], tr);
  const index = outline.findIndex((l) => l.id === lesson.id);

  const [resourcesRes, exercisesRes, progressRes] = await Promise.all([
    supabase
      .from("lesson_resources")
      .select("id, caption, position, recordings(id, title, performers, recorded_on, duration_seconds, storage_bucket, storage_path), documents(id, title, storage_bucket, storage_path)")
      .eq("lesson_id", lesson.id)
      .order("position"),
    supabase
      .from("exercises")
      .select("id, kind, title, exercise_questions(id, prompt, options, position)")
      .eq("lesson_id", lesson.id)
      .eq("status", "published")
      .order("position"),
    viewer
      ? supabase.from("lesson_progress").select("lesson_id, status").eq("user_id", viewer.id).in("lesson_id", outline.map((l) => l.id))
      : Promise.resolve({ data: [] as { lesson_id: string; status: string }[] }),
  ]);

  const resources = resourcesRes.data ?? [];
  const recordings = resources.flatMap((r) => (r.recordings ? [{ ...r.recordings, caption: r.caption }] : []));
  const documents = resources.flatMap((r) => (r.documents ? [r.documents] : []));
  const urls = await mediaUrls([...recordings, ...documents]);
  const completed = new Set((progressRes.data ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id));

  const teachers = (course.course_teachers ?? [])
    .map((ct) => ct.profiles?.display_name || ct.profiles?.full_name)
    .filter(Boolean)
    .join("، ");
  const prerequisite = lesson.lesson_prerequisites?.[0]?.lessons?.title;

  // Scale notes are stored as "Arabic name|Western name"; ajnas as [{ name, notes }].
  const maqam = lesson.maqamat;
  const notes = (maqam?.scale_notes ?? []).map((n) => {
    const [arName, latin] = n.split("|");
    return { ar: arName, latin: latin ?? "" };
  });
  // ajnas: [{ name, notes, start? }] — `start` (degree index) comes from the maqam engine's
  // toLessonFields(); older rows without it are laid out one after another.
  const ajnasRaw = (Array.isArray(maqam?.ajnas) ? maqam.ajnas : []) as { name: string; notes?: number; start?: number }[];
  const bands = layoutAjnas(ajnasRaw, notes.length);
  const lowerEnd = bands[0] ? bands[0].start + bands[0].span - 1 : 3;
  // Ghammaz: where the first upper jins starts; otherwise the last note of the lower jins.
  const ghammaz = bands[1]?.start ?? lowerEnd;

  const exercises = (exercisesRes.data ?? []).filter((e) => (e.exercise_questions ?? []).length > 0);
  const n = (v: number) => formatNumber(locale, v);
  const lessonPath = `${base}/academy/${courseSlug}/${lessonSlug}`;

  return (
    <>
      <SiteHeader locale={locale} active="academy" />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 pt-10 pb-26 sm:px-6">
        <nav aria-label={t.breadcrumb} className="flex flex-wrap gap-2 text-sm text-muted">
          <Link href={`${base}/academy`}>{t.title}</Link>
          <span aria-hidden="true">›</span>
          <span>{course.title}</span>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{fill(t.lesson, { n: n(index + 1) })}</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-6 rounded-[32px] panel-feature-dual p-6 sm:p-12">
          <div className="flex max-w-[760px] flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              <span className="chip">{fill(t.level, { level: t.levels[lesson.level ?? course.level] })}</span>
              {prerequisite && <span className="chip chip-teal">{fill(t.requires, { lesson: prerequisite })}</span>}
            </div>
            <h1 className="m-0 font-display text-5xl leading-[1.15] font-bold sm:text-[72px]" {...contentLang(lesson, "title", locale)}>{lesson.title}</h1>
            {lesson.summary && <p className="m-0 text-lg leading-[1.9] font-light text-soft" {...contentLang(lesson, "summary", locale)}>{lesson.summary}</p>}
          </div>
          {teachers && <span className="text-sm text-muted">{fill(t.by, { name: teachers })}</span>}
        </div>

        <ol aria-label={t.stagesLabel} className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-2.5 p-0">
          {t.stages.map((stage, i) => (
            <li key={stage} className={`flex flex-col gap-0.5 rounded-[18px] px-[18px] py-4 ${i === 0 ? "bg-gold text-gold-ink" : "card"}`}>
              <span className={`text-xs ${i === 0 ? "" : "text-muted"}`}>{n(i + 1)}{i === 0 ? ` · ${t.now}` : ""}</span>
              <span className={i === 0 ? "font-semibold" : "font-medium"}>{stage}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_min(600px,100%)] flex-col gap-5">
            {lesson.objectives.length > 0 && (
              <section aria-labelledby="goals" className="card p-6 sm:p-8">
                <h2 id="goals" className="m-0 mb-4 font-display text-2xl font-semibold">{t.goals}</h2>
                <ul className="m-0 flex flex-col gap-2.5 ps-5 leading-[1.8] text-soft">
                  {lesson.objectives.map((o) => <li key={o}>{o}</li>)}
                </ul>
              </section>
            )}

            {notes.length > 0 && (
              <section aria-labelledby="scale" className="card flex flex-col gap-5 p-6 sm:p-8">
                <div>
                  <h2 id="scale" className="m-0 mb-2 font-display text-2xl font-semibold">{t.scale}</h2>
                  {maqam?.description && <p className="m-0 text-[15px] leading-[1.8] text-muted">{maqam.description}</p>}
                </div>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[560px] gap-2" style={{ gridTemplateColumns: `repeat(${notes.length}, minmax(0, 1fr))` }}>
                    {notes.map((note, i) => {
                      const cls =
                        i === 0 ? "bg-gold text-gold-ink border-gold"
                        : i === ghammaz ? "bg-teal text-teal-ink border-teal"
                        : i <= lowerEnd ? "bg-gold/10 border-gold/25"
                        : "bg-teal/10 border-teal/25";
                      return (
                        <div key={i} className={`flex flex-col gap-1.5 rounded-2xl border px-1 py-[18px] text-center ${cls}`}>
                          <span className="font-display text-[19px] font-semibold">{note.ar}</span>
                          <span className="text-[13px] opacity-80" dir="auto">{note.latin}</span>
                        </div>
                      );
                    })}
                    {bands.map((j, i) => (
                      <div
                        key={j.name}
                        className={`border-t-2 pt-2.5 text-[13px] font-medium ${i % 2 === 0 ? "border-gold text-gold" : "border-teal text-teal-light"}`}
                        // Own row per jins: adjacent ajnas may share a note (e.g. Bayati's Nawa).
                        style={{ gridColumn: `${j.start + 1} / span ${j.span}`, gridRow: i + 2 }}
                      >
                        {j.name}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {lesson.body && (
              <section className="card p-6 text-[16px] leading-[1.9] whitespace-pre-line text-soft sm:p-8">{lesson.body}</section>
            )}

            {recordings.length > 0 && (
              <section aria-labelledby="listen" className="card flex flex-col gap-2.5 p-6 sm:p-8">
                <h2 id="listen" className="m-0 mb-2 font-display text-2xl font-semibold">{t.listen}</h2>
                {recordings.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 rounded-[18px] border border-white/6 bg-white/4 px-[18px] py-3.5">
                    <AudioButton src={urls.get(r.storage_path)} label={`${dict.members.play}: ${r.title}`} size={48} solid />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-medium">{r.caption || r.title}</span>
                      <span className="text-[13px] text-muted">
                        <MetaLine parts={[r.performers, r.recorded_on?.slice(0, 4), formatDuration(r.duration_seconds)]} />
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {exercises.map((ex) => (
              <Quiz
                key={ex.id}
                exerciseId={ex.id}
                title={ex.title}
                signedIn={!!viewer}
                numberFormat={intlLocale[locale]}
                questions={(ex.exercise_questions ?? [])
                  .sort((a, b) => a.position - b.position)
                  .map((q) => ({ id: q.id, prompt: q.prompt, options: (Array.isArray(q.options) ? q.options : []).map(String) }))}
                labels={t}
              />
            ))}

            {viewer?.isActive && (
              <form action={markLessonDone}>
                <input type="hidden" name="lesson_id" value={lesson.id} />
                <input type="hidden" name="path" value={lessonPath} />
                <button type="submit" className="btn-ghost" disabled={completed.has(lesson.id)}>
                  {completed.has(lesson.id) ? t.done : t.markDone}
                </button>
              </form>
            )}
          </div>

          <aside className="flex flex-[1_1_min(300px,100%)] flex-col gap-5">
            <section aria-labelledby="outline" className="card p-6">
              <h2 id="outline" className="m-0 mb-3 font-display text-xl font-semibold">{t.outline}</h2>
              <ol className="m-0 flex list-none flex-col p-0 text-[15px]">
                {outline.map((l, i) => {
                  const current = l.id === lesson.id;
                  return (
                    <li key={l.id} className="border-b border-white/7 last:border-0">
                      <Link
                        href={`${base}/academy/${courseSlug}/${l.slug}`}
                        aria-current={current ? "page" : undefined}
                        className={`flex min-h-11 items-center py-2 no-underline ${current ? "font-semibold text-gold" : completed.has(l.id) ? "text-muted" : "text-text"}`}
                      >
                        {n(i + 1)}. {l.title} {completed.has(l.id) ? "✓" : ""}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
            {documents.length > 0 && (
              <section aria-labelledby="pdfs" className="card flex flex-col gap-1.5 p-6">
                <h2 id="pdfs" className="m-0 mb-1.5 font-display text-xl font-semibold">{t.supporting}</h2>
                {documents.map((d) => (
                  <a key={d.id} href={urls.get(d.storage_path)} target="_blank" rel="noopener" className="flex min-h-11 items-center no-underline">
                    {d.title}
                  </a>
                ))}
              </section>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
