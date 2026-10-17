import type { Metadata } from "next";
import Link from "next/link";
import { AudioButton } from "@/components/audio-button";
import { FileIcon } from "@/components/logo";
import { hasLocale } from "@/i18n/config";
import { fill, formatDate, formatNumber, formatTime, getDictionary, resolveLocale } from "@/i18n/server";
import { requireViewer } from "@/lib/auth";
import { getUpcomingEvents } from "@/lib/data/events";
import { contentLang, getTranslations, localize } from "@/lib/data/i18n";
import { formatDuration, mediaUrls } from "@/lib/data/media";
import { createClient } from "@/lib/supabase/server";
import { RsvpButtons } from "./rsvp-buttons";
import { MetaLine } from "@/components/meta-line";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata({ params }: PageProps<"/[lang]/members">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").members.navLabel };
}

export default async function MembersPage({ params }: PageProps<"/[lang]/members">) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const viewer = await requireViewer(locale);
  const base = `/${locale}`;

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="m-0 mb-1 text-[15px] text-muted">{dict.members.greeting}</p>
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{viewer.fullName || viewer.email}</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {viewer.roles.map((r) => <span key={r} className="chip">{dict.roles[r]}</span>)}
      </div>
    </div>
  );

  // Not yet approved: nothing internal to show; RLS would return empty lists anyway.
  if (!viewer.isActive) {
    return (
      <>
        {header}
        <section className="flex flex-col items-start gap-4 rounded-[28px] border border-gold/30 p-8">
          <h2 className="m-0 font-display text-[28px] font-semibold">{dict.auth.pendingTitle}</h2>
          <p className="m-0 leading-[1.8] text-soft">{dict.auth.pendingText}</p>
          <Link href={`${base}/join`} className="btn-gold">{dict.auth.sendRequest}</Link>
        </section>
      </>
    );
  }

  const supabase = await createClient();
  const [rawEvents, recRes, docRes, ensRes, enrollRes] = await Promise.all([
    getUpcomingEvents({ limit: 5 }),
    supabase
      .from("recordings")
      .select("id, title, performers, duration_seconds, visibility, storage_bucket, storage_path")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("documents")
      .select("id, title, mime_type, storage_bucket, storage_path")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("ensemble_members").select("ensembles(name)").eq("user_id", viewer.id).is("left_at", null),
    supabase.from("course_enrollments").select("course_id, courses(id, slug, title)").eq("user_id", viewer.id),
  ]);

  const events = localize(rawEvents, await getTranslations("events", rawEvents.map((e) => e.id), locale));
  const next = events[0];
  const recordings = recRes.data ?? [];
  const documents = docRes.data ?? [];
  const ensembles = (ensRes.data ?? []).map((r) => r.ensembles?.name).filter(Boolean) as string[];

  const [{ data: rsvp }, urls] = await Promise.all([
    next
      ? supabase.from("event_rsvps").select("response").eq("event_id", next.id).eq("user_id", viewer.id).maybeSingle()
      : Promise.resolve({ data: null }),
    mediaUrls([...recordings, ...documents]),
  ]);

  // Progress per enrolled course: completed lessons / published lessons.
  const courses = (enrollRes.data ?? []).map((e) => e.courses).filter(Boolean) as { id: string; slug: string; title: string }[];
  const courseIds = courses.map((c) => c.id);
  const [lessonsRes, progressRes] = courseIds.length
    ? await Promise.all([
        supabase.from("lessons").select("id, course_id, slug, position").in("course_id", courseIds).eq("status", "published").order("position"),
        supabase.from("lesson_progress").select("lesson_id, status").eq("user_id", viewer.id).eq("status", "completed"),
      ])
    : [{ data: [] }, { data: [] }];
  const doneIds = new Set((progressRes.data ?? []).map((p) => p.lesson_id));
  const progress = courses.map((c) => {
    const lessons = (lessonsRes.data ?? []).filter((l) => l.course_id === c.id);
    const done = lessons.filter((l) => doneIds.has(l.id)).length;
    const nextLesson = lessons.find((l) => !doneIds.has(l.id)) ?? lessons[0];
    return { ...c, total: lessons.length, done, nextLesson };
  });
  const resume = progress.find((p) => p.nextLesson);

  return (
    <>
      {header}
      {ensembles.length > 0 && (
        <div className="-mt-3 flex flex-wrap gap-2">
          {ensembles.map((n) => <span key={n} className="chip chip-teal">{n}</span>)}
        </div>
      )}

      <section aria-labelledby="next-reh" className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] panel-feature p-6 sm:p-8">
        {next ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-gold">{dict.members.next}</span>
              <h2 id="next-reh" className="m-0 font-display text-[28px] font-semibold" {...contentLang(next, "title", locale)}>{next.title}</h2>
              <span className="text-[15px] text-muted">
                <MetaLine parts={[formatDate(locale, next.starts_at, { weekday: "long" }), formatTime(locale, next.starts_at), next.venue]} />
              </span>
            </div>
            <RsvpButtons
              eventId={next.id}
              locale={locale}
              initial={(rsvp?.response as "yes" | "maybe" | "no" | undefined) ?? null}
              labels={{ group: dict.members.attend, yes: dict.members.yes, maybe: dict.members.maybe, no: dict.members.no, status: dict.members.status }}
            />
          </>
        ) : (
          <h2 id="next-reh" className="m-0 font-display text-2xl font-semibold text-muted">{dict.members.noNext}</h2>
        )}
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-5">
        <section id="agenda" aria-labelledby="agenda-h" className="card flex flex-col gap-1.5 p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="agenda-h" className="m-0 font-display text-[22px] font-semibold">{dict.members.upcoming}</h2>
            <Link href={`${base}/events`} className="text-sm">{dict.events.all}</Link>
          </div>
          {events.length === 0 && <EmptyState title={dict.members.noNext} action={{ href: `${base}/events`, label: dict.events.all }} />}
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-4 border-t border-white/7 py-3.5">
              <span className="min-w-24 text-sm font-medium text-gold">{formatDate(locale, e.starts_at)}</span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span {...contentLang(e, "title", locale)}>{e.title}</span>
                <span className="text-[13px] text-muted"><MetaLine parts={[formatTime(locale, e.starts_at), e.venue]} /></span>
              </div>
            </div>
          ))}
        </section>

        <section id="recs" aria-labelledby="recs-h" className="card flex flex-col gap-1.5 p-6">
          <h2 id="recs-h" className="m-0 mb-2 font-display text-[22px] font-semibold">{dict.members.recent}</h2>
          {recordings.length === 0 && <EmptyState title={dict.members.empty} />}
          {recordings.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-t border-white/7 py-2.5">
              <AudioButton src={urls.get(r.storage_path)} label={`${dict.members.play}: ${r.title}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate">{r.title}</span>
                <span className="text-[13px] text-muted"><MetaLine parts={[r.performers, formatDuration(r.duration_seconds)]} /></span>
              </div>
              <span className="chip chip-teal text-xs!">{dict.access[r.visibility]}</span>
            </div>
          ))}
        </section>

        <section id="files" aria-labelledby="files-h" className="card flex flex-col gap-1.5 p-6">
          <h2 id="files-h" className="m-0 mb-2 font-display text-[22px] font-semibold">{dict.members.files}</h2>
          {documents.length === 0 && <EmptyState title={dict.members.empty} />}
          {documents.map((d) => (
            <a key={d.id} href={urls.get(d.storage_path)} target="_blank" rel="noopener" className="flex min-h-12 items-center gap-3 border-t border-white/7 py-1.5 text-text no-underline hover:text-gold">
              <FileIcon />
              <span className="flex-1">{d.title}</span>
              <span className="text-xs text-muted">{d.mime_type === "application/pdf" ? "PDF" : ""}</span>
            </a>
          ))}
        </section>

        <section aria-labelledby="prog-h" className="card flex flex-col gap-[18px] p-6">
          <h2 id="prog-h" className="m-0 font-display text-[22px] font-semibold">{dict.members.progress}</h2>
          {progress.length === 0 && <EmptyState title={dict.members.empty} action={{ href: `${base}/academy`, label: dict.academy.courses }} />}
          {progress.map((c) => (
            <div key={c.id} className="flex flex-col gap-2.5">
              <div className="flex justify-between text-[15px]">
                <span>{c.title}</span>
                <span className="text-muted">
                  {fill(dict.members.lessonsOf, { done: formatNumber(locale, c.done), total: formatNumber(locale, c.total) })}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.done} aria-label={c.title}>
                <div className="h-2 rounded-full bg-gold" style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
          {resume?.nextLesson && (
            <Link href={`${base}/academy/${resume.slug}/${resume.nextLesson.slug}`} className="btn-gold">
              {dict.members.continue}
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
