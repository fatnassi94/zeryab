import type { Metadata } from "next";
import Link from "next/link";
import { hasLocale } from "@/i18n/config";
import { fill, formatDate, getDictionary, resolveLocale } from "@/i18n/server";
import { AudioButton } from "@/components/audio-button";
import { FileIcon } from "@/components/logo";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth";
import { maqamName } from "@/lib/data/maqamat";
import { formatDuration, mediaUrls } from "@/lib/data/media";
import { getProgramEdits, loadPrograms } from "@/lib/data/programs";
import { formatBytes, type DocumentKind, type LibraryKind } from "@/lib/library";
import { programAsset, programSongs } from "@/lib/programs";
import { createClient } from "@/lib/supabase/server";
import { deleteLibraryItem, setLibraryStatus } from "./library-actions";
import { LibraryEdit } from "./library-edit";
import type { LibraryValues } from "./library-fields";
import { LibraryUpload } from "./library-upload";

type Item = {
  id: string; title: string; description: string | null; status: "draft" | "published" | "archived"; visibility: string;
  storage_bucket: string; storage_path: string; mime_type: string | null; size_bytes: number | null; created_at: string;
  source: string | null; rights: string | null;
  performers?: string | null; composer?: string | null; recorded_on?: string | null; maqam_id?: string | null; duration_seconds?: number | null;
  kind?: DocumentKind; author?: string | null; document_date?: string | null;
};

const STATUS_CHIP = { draft: "chip bg-white/8! text-muted!", published: "chip chip-teal", archived: "chip" } as const;

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/archive">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(hasLocale(lang) ? lang : "ar").admin.archive.title };
}

/** Archive back office: the show programs (each title opens its page in edit mode), recordings and documents. */
export default async function ArchiveAdminPage({ params }: PageProps<"/[lang]/admin/archive">) {
  const locale = await resolveLocale(params);
  await requireRole(locale, ["librarian"]);
  const dict = getDictionary(locale);
  const t = dict.admin.archive;
  const supabase = await createClient();
  const common = "id, title, description, status, visibility, storage_bucket, storage_path, mime_type, size_bytes, created_at, source, rights";
  const [programs, edits, { data: recs }, { data: docs }, { data: rawMaqamat }] = await Promise.all([
    loadPrograms(),
    getProgramEdits(),
    supabase.from("recordings").select(`${common}, performers, composer, recorded_on, maqam_id, duration_seconds`).order("created_at", { ascending: false }).limit(200),
    supabase.from("documents").select(`${common}, kind, author, document_date`).order("created_at", { ascending: false }).limit(200),
    supabase.from("maqamat").select("id, slug, name").eq("status", "published").order("position"),
  ]);
  const base = `/${locale}/library/programs`;
  const recordings = (recs ?? []) as Item[];
  const documents = (docs ?? []) as Item[];
  const urls = await mediaUrls([...recordings, ...documents]);
  const maqamat = (rawMaqamat ?? []).map((m) => ({ id: m.id, name: maqamName({ ...m, translatedFields: [] }, locale).text }));
  const lib = t.library;
  const fieldLabels = { ...lib.fields, kinds: lib.kinds, visibilities: { members: dict.access.members, public: dict.access.public }, statuses: lib.statuses };

  const valuesOf = (x: Item): LibraryValues => ({
    title: x.title, description: x.description ?? "", performers: x.performers ?? "", composer: x.composer ?? "", author: x.author ?? "",
    date: x.recorded_on ?? x.document_date ?? "", kind: x.kind ?? "other", maqam: x.maqam_id ?? "",
    visibility: x.visibility === "public" ? "public" : "members", status: x.status, source: x.source ?? "", rights: x.rights ?? "",
  });

  const hidden = (kind: LibraryKind, id: string) => (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
    </>
  );
  const statusButton = (kind: LibraryKind, x: Item, to: Item["status"], label: string) => (
    <form action={setLibraryStatus}>
      {hidden(kind, x.id)}
      <input type="hidden" name="status" value={to} />
      <button type="submit" className="btn-ghost min-h-9! px-3! text-[13px]">{label}</button>
    </form>
  );

  const section = (kind: LibraryKind, items: Item[]) => (
    <section aria-labelledby={`${kind}-h`} className="card flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${kind}-h`} className="m-0 font-display text-[22px] font-semibold">{lib[kind].title}</h2>
        <p className="m-0 text-sm text-muted">{lib[kind].intro}</p>
      </div>

      <details className="rounded-2xl border border-gold/30">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 font-medium text-gold">+ {lib[kind].add}</summary>
        <div className="border-t border-white/8 p-4">
          <LibraryUpload kind={kind} labels={{ ...lib.upload, fileHint: lib[kind].fileHint, fieldError: lib.fields.fieldError }} fieldLabels={fieldLabels} maqamat={maqamat} />
        </div>
      </details>

      {!items.length ? (
        <EmptyState title={lib[kind].none} />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((x) => (
            <li key={x.id} className="flex flex-col gap-3 border-t border-white/7 py-4">
              <div className="flex flex-wrap items-center gap-3">
                {kind === "recordings" ? (
                  <AudioButton src={urls.get(x.storage_path)} label={`${dict.members.play}: ${x.title}`} />
                ) : (
                  <a href={urls.get(x.storage_path)} target="_blank" rel="noopener" aria-label={`${lib.open}: ${x.title}`} className="grid size-11 place-items-center rounded-full border border-line text-gold"><FileIcon /></a>
                )}
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                  <span className="font-medium">{x.title}</span>
                  <span className="text-[13px] text-muted">
                    {[
                      kind === "recordings" ? x.performers : x.kind && lib.kinds[x.kind],
                      kind === "recordings" ? formatDuration(x.duration_seconds ?? null) : x.author,
                      formatBytes(x.size_bytes),
                      formatDate(locale, x.created_at),
                    ].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className="flex flex-wrap gap-1.5">
                  <span className={STATUS_CHIP[x.status]}>{lib.statuses[x.status]}</span>
                  <span className="chip">{x.visibility === "public" ? dict.access.public : dict.access.members}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {x.status !== "published" && statusButton(kind, x, "published", lib.publish)}
                {x.status === "published" && statusButton(kind, x, "draft", lib.hide)}
                {x.status !== "archived" && statusButton(kind, x, "archived", lib.archive)}
                <form action={deleteLibraryItem}>
                  {hidden(kind, x.id)}
                  <ConfirmButton message={lib.deleteConfirm} className="btn-ghost min-h-9! px-3! text-[13px] text-rose!">{lib.delete}</ConfirmButton>
                </form>
              </div>
              <details>
                <summary className="inline-flex min-h-10 cursor-pointer list-none items-center text-sm text-gold">{lib.edit}</summary>
                <div className="mt-3 rounded-2xl bg-white/3 p-4">
                  <LibraryEdit kind={kind} id={x.id} values={valuesOf(x)} labels={fieldLabels} maqamat={maqamat} save={lib.save} saved={lib.saved} error={lib.upload.error} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[34px] font-semibold sm:text-[44px]">{t.title}</h1>
        <p className="m-0 max-w-[720px] text-muted">{t.intro}</p>
      </div>

      <section aria-labelledby="programs-h" className="card flex flex-col gap-4 p-6">
        <h2 id="programs-h" className="m-0 font-display text-[22px] font-semibold">{t.programs}</h2>
        <ul className="m-0 flex list-none flex-col p-0">
          {programs.map((p) => {
            const row = edits.get(p.slug);
            const changed = row && Object.keys(row.edits).length > 0;
            return (
              <li key={p.slug} className="flex flex-wrap items-center gap-4 border-b border-white/6 py-4 last:border-0">
                {/* Pre-rendered page of the program: static file, no optimizer needed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={programAsset.page(p.slug, 1, "sm")} alt="" width={800} height={1131} loading="lazy" className="h-auto w-14 shrink-0 rounded-[4px] bg-white" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[13px] text-gold">{p.series[locale]}</span>
                  <Link href={`${base}/${p.slug}?edit=1`} className="font-display text-2xl font-semibold text-text no-underline hover:text-gold-light">
                    {p.title[locale]}
                  </Link>
                  <span className="text-[13px] text-muted">
                    {fill(dict.programs.stats, { tableaux: p.tableaux.length, songs: programSongs(p).length, pages: p.pages.length })}
                    {" · "}
                    {changed ? fill(t.edited, { date: formatDate(locale, row.updatedAt) }) : t.original}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`${base}/${p.slug}?edit=1`} className="btn-gold min-h-10! px-4!">{t.edit}</Link>
                  <Link href={`${base}/${p.slug}`} className="btn-ghost min-h-10! px-4!">{t.view}</Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {section("recordings", recordings)}
      {section("documents", documents)}
    </>
  );
}
