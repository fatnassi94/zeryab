import { TextArea, TextField } from "@/components/ui/field";
import { DOCUMENT_KINDS, LIBRARY_STATUSES, LIBRARY_VISIBILITY, type DocumentKind, type LibraryField, type LibraryKind } from "@/lib/library";

export type LibraryLabels = {
  title: string; description: string; performers: string; composer: string; author: string; recordedOn: string; documentDate: string;
  kind: string; kinds: Record<DocumentKind, string>; maqam: string; noMaqam: string; visibility: string; visibilities: Record<(typeof LIBRARY_VISIBILITY)[number], string>;
  status: string; statuses: Record<(typeof LIBRARY_STATUSES)[number], string>; source: string; rights: string; rightsHint: string; fieldError: string;
};

export type LibraryValues = {
  title: string; description: string; performers: string; composer: string; author: string; date: string; kind: DocumentKind;
  maqam: string; visibility: (typeof LIBRARY_VISIBILITY)[number]; status: (typeof LIBRARY_STATUSES)[number]; source: string; rights: string;
};

export const EMPTY_LIBRARY_VALUES: LibraryValues = {
  title: "", description: "", performers: "", composer: "", author: "", date: "", kind: "score", maqam: "", visibility: "members", status: "published", source: "", rights: "",
};

/** The details of a recording or a document (shared by the upload and edit forms). */
export function LibraryFields({ kind, idPrefix, values, labels, maqamat, errors }: {
  kind: LibraryKind; idPrefix: string; values: LibraryValues; labels: LibraryLabels;
  maqamat: { id: string; name: string }[]; errors?: Partial<Record<LibraryField, true>>;
}) {
  const bad = (k: LibraryField) => (errors?.[k] ? labels.fieldError : undefined);
  const id = (k: string) => `${idPrefix}-${k}`;
  const select = (k: string, label: string, value: string, options: [string, string][]) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id(k)} className="label">{label}</label>
      <select id={id(k)} name={k} defaultValue={value} className="field">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
      <div className="col-span-full">
        <TextField id={id("title")} name="title" label={labels.title} defaultValue={values.title} required minLength={2} maxLength={160} error={bad("title")} />
      </div>
      {kind === "recordings" ? (
        <>
          <TextField id={id("performers")} name="performers" label={labels.performers} defaultValue={values.performers} maxLength={200} error={bad("performers")} />
          <TextField id={id("composer")} name="composer" label={labels.composer} defaultValue={values.composer} maxLength={200} error={bad("composer")} />
          <TextField id={id("date")} name="date" type="date" label={labels.recordedOn} defaultValue={values.date} error={bad("date")} />
          {select("maqam", labels.maqam, values.maqam, [["", labels.noMaqam], ...maqamat.map((m): [string, string] => [m.id, m.name])])}
        </>
      ) : (
        <>
          {select("kind", labels.kind, values.kind, DOCUMENT_KINDS.map((k): [string, string] => [k, labels.kinds[k]]))}
          <TextField id={id("author")} name="author" label={labels.author} defaultValue={values.author} maxLength={200} error={bad("author")} />
          <TextField id={id("date")} name="date" type="date" label={labels.documentDate} defaultValue={values.date} error={bad("date")} />
        </>
      )}
      {select("visibility", labels.visibility, values.visibility, LIBRARY_VISIBILITY.map((v): [string, string] => [v, labels.visibilities[v]]))}
      {select("status", labels.status, values.status, LIBRARY_STATUSES.map((v): [string, string] => [v, labels.statuses[v]]))}
      <div className="col-span-full">
        <TextArea id={id("description")} name="description" label={labels.description} defaultValue={values.description} maxLength={4000} rows={3} error={bad("description")} />
      </div>
      <TextField id={id("source")} name="source" label={labels.source} defaultValue={values.source} maxLength={300} error={bad("source")} />
      <TextField id={id("rights")} name="rights" label={labels.rights} hint={labels.rightsHint} defaultValue={values.rights} maxLength={300} error={bad("rights")} />
    </div>
  );
}
