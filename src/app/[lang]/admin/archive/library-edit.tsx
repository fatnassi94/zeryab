"use client";

import { useActionState } from "react";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { LibraryKind } from "@/lib/library";
import { updateLibraryItem, type LibraryState } from "./library-actions";
import { LibraryFields, type LibraryLabels, type LibraryValues } from "./library-fields";

/** Edit the details of an uploaded item (the file stays as it is). */
export function LibraryEdit({ kind, id, values, labels, maqamat, save, saved, error }: {
  kind: LibraryKind; id: string; values: LibraryValues; labels: LibraryLabels; maqamat: { id: string; name: string }[];
  save: string; saved: string; error: string;
}) {
  const [state, action] = useActionState<LibraryState, FormData>(updateLibraryItem, { status: "idle" });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <LibraryFields kind={kind} idPrefix={`ed-${id}`} values={values} labels={labels} maqamat={maqamat} errors={state.errors} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{save}</SubmitButton>
        <span aria-live="polite">
          {state.status === "saved" && <Notice tone="success">{saved}</Notice>}
          {state.status === "error" && <Notice tone="error">{error}</Notice>}
          {state.status === "fields" && <Notice tone="error">{labels.fieldError}</Notice>}
        </span>
      </div>
    </form>
  );
}
