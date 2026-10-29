import type { ReactNode } from "react";
import { EditChecks, EditColor, EditField, EditNumber, EditProvider, EditSelect } from "@/components/edit/edit-kit";
import type { Locale } from "@/i18n/config";
import { fill, getDictionary } from "@/i18n/server";
import { PROGRAM_ICONS, VOICES, type Program } from "@/lib/programs";
import { saveProgramEdits } from "../../../admin/archive/actions";

/** In edit mode, every field inside saves to this program. */
export function EditScope({ slug, on, children }: { slug: string; on: boolean; children: ReactNode }) {
  return on ? <EditProvider save={saveProgramEdits.bind(null, slug)}>{children}</EditProvider> : children;
}

/** A folding panel of fields under a section of the page, in edit mode. */
function Panel({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="card group rounded-[20px] border-gold/30! p-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-display text-lg font-semibold text-gold">
        {title}
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-5 border-t border-white/8 px-5 pt-4 pb-5">{children}</div>
    </details>
  );
}

const grid = "grid gap-3 sm:grid-cols-2";

type Part = "idea" | "tableaux" | "scene" | "ending";

/** Fields for one part of the page (the header is edited in place). Texts are those of the page's language. */
export function ProgramEditor({ program, locale, part }: { program: Program; locale: Locale; part: Part }) {
  const dict = getDictionary(locale);
  const e = { ...dict.programs.edit, sharedHint: dict.programs.ideaHint };
  const f = e.fields;
  const L = locale;
  const arabic = { dir: "rtl" as const, lang: "ar" };
  const voiceOptions = VOICES.map((v) => ({ value: v, label: dict.programs.scenes.voices[v] }));
  const iconOptions = PROGRAM_ICONS.map((i) => ({ value: i, label: e.icons[i] }));
  const pages = program.pages.length;

  if (part === "idea") {
    return (
      <Panel title={e.idea}>
        <EditField path={`labels.ideaHint.${L}`} label={f.hint} value={program.labels?.ideaHint?.[L] || e.sharedHint} multiline />
        <EditField path={`centre.${L}`} label={f.centre} value={program.centre[L]} />
        {program.steps[L].map((s, i) => (
          <EditField key={i} path={`steps.${L}.${i}`} label={fill(f.step, { n: i + 1 })} value={s} multiline />
        ))}
      </Panel>
    );
  }

  if (part === "tableaux") {
    return (
      <Panel title={e.tableaux}>
        {program.tableaux.map((tb, ti) => (
          <fieldset key={tb.n} className="m-0 flex flex-col gap-4 rounded-2xl border border-white/10 p-4">
            <legend className="px-2 font-semibold" style={{ color: tb.color }}>{fill(dict.programs.tableauLabel, { n: tb.n })}</legend>
            <div className={grid}>
              <EditField path={`tableaux.${ti}.title.${L}`} label={f.tableauTitle} value={tb.title[L]} />
              {tb.stop && <EditField path={`tableaux.${ti}.stop.name.${L}`} label={f.place} value={tb.stop.name[L]} />}
            </div>
            <EditField path={`tableaux.${ti}.mood.${L}`} label={f.mood} value={tb.mood?.[L] ?? ""} multiline />
            <div className="flex flex-wrap items-end gap-4">
              <EditColor path={`tableaux.${ti}.color`} label={f.color} value={tb.color} />
              <EditSelect path={`tableaux.${ti}.icon`} label={f.icon} value={tb.icon} options={iconOptions} />
              <EditNumber path={`tableaux.${ti}.page`} label={f.page} value={tb.page} min={1} max={pages} />
            </div>
            {tb.songs.map((s, si) => (
              <div key={s.n} className="flex flex-col gap-3 rounded-xl bg-white/3 p-3">
                <span className="text-sm text-muted">{fill(f.song, { n: s.n })}</span>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                  <EditField path={`tableaux.${ti}.songs.${si}.title`} label={f.songTitle} value={s.title} {...arabic} />
                  <EditField path={`tableaux.${ti}.songs.${si}.rhythm`} label={f.rhythm} value={s.rhythm ?? ""} {...arabic} />
                  <EditNumber path={`tableaux.${ti}.songs.${si}.page`} label={f.page} value={s.page} min={1} max={pages} />
                </div>
                {s.voices && <EditChecks path={`tableaux.${ti}.songs.${si}.voices`} label={f.voices} value={s.voices} options={voiceOptions} />}
              </div>
            ))}
          </fieldset>
        ))}
      </Panel>
    );
  }

  if (part === "scene") {
    const scene = program.scene;
    if (scene.kind === "flight") {
      return (
        <Panel title={e.scene}>
          {scene.stations.map((st, i) => (
            <fieldset key={i} className="m-0 flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
              <legend className="px-2 text-sm text-muted">{fill(f.station, { n: i + 1 })}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <EditField path={`scene.stations.${i}.place.${L}`} label={f.place} value={st.place[L]} />
                <EditField path={`scene.stations.${i}.dance.${L}`} label={f.dance} value={st.dance[L]} />
                <EditField path={`scene.stations.${i}.rhythm`} label={f.rhythm} value={st.rhythm ?? ""} {...arabic} />
              </div>
            </fieldset>
          ))}
        </Panel>
      );
    }
    if (scene.kind === "majlis") {
      return (
        <Panel title={e.scene}>
          {scene.moments.map((m, i) => (
            <EditField key={i} path={`scene.moments.${i}.note.${L}`} label={fill(f.song, { n: m.song })} value={m.note[L]} multiline />
          ))}
        </Panel>
      );
    }
    return null;
  }

  return (
    <Panel title={e.ending}>
      <EditField path={`next.${L}`} label={f.next} value={program.next?.[L] ?? ""} />
    </Panel>
  );
}
