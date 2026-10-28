import { Fragment } from "react";
import type { Block } from "@/lib/courses";
import { IqaPlayer, StrokeDemo, type IqaLabels } from "./iqa";
import { Metronome, type MetronomeLabels } from "./metronome";
import { NotationExample, type NotationLabels } from "./notation-example";

/** `**bold**` inside lesson text. */
function rich(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-text">{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

/** A lesson article written in code (src/lib/courses): text, tables, staff examples, a metronome, practice. */
export function LessonBlocks({ blocks, labels }: { blocks: Block[]; labels: NotationLabels & MetronomeLabels & { tip: string; practice: string; iqa: IqaLabels } }) {
  return (
    <div lang="ar" dir="rtl" className="flex flex-col gap-5 text-[17px] leading-[2] text-soft">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return <p key={i} className="m-0">{rich(b.text)}</p>;
          case "h":
            return <h2 key={i} className="m-0 mt-3 font-display text-[26px] font-semibold text-text">{b.text}</h2>;
          case "list":
            return (
              <ol key={i} className="m-0 flex flex-col gap-2 ps-6">
                {b.items.map((item) => <li key={item}>{rich(item)}</li>)}
              </ol>
            );
          case "tip":
            return (
              <aside key={i} className="rounded-[20px] border border-gold/25 bg-gold/8 px-5 py-4 text-[16px]">
                <span className="mb-1 block text-sm font-semibold text-gold">{labels.tip}</span>
                {rich(b.text)}
              </aside>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-[16px]">
                  <thead>
                    <tr>{b.head.map((h) => <th key={h} scope="col" className="border-b border-white/12 px-3 py-2.5 text-start text-sm font-normal text-muted">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row) => (
                      <tr key={row.join()}>{row.map((c, j) => <td key={j} className={`border-b border-white/6 px-3 py-3 ${j === 1 ? "font-medium text-text" : ""}`}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "metronome":
            return <Metronome key={i} bpm={b.bpm} beats={b.beats} text={b.text} labels={labels} />;
          case "staff":
            return <NotationExample key={i} notation={b.notation} caption={b.caption} names={b.names} toggleNames={b.toggleNames} tempo={b.tempo} iqa={b.iqa} labels={labels} />;
          case "iqa":
            return <IqaPlayer key={i} iqa={b.iqa} caption={b.caption} tempo={b.tempo} labels={labels.iqa} />;
          case "strokes":
            return <StrokeDemo key={i} labels={labels.iqa} />;
          case "practice":
            return (
              <section key={i} className="flex flex-col gap-4 rounded-[22px] border border-white/10 bg-white/3 p-5 sm:p-6">
                <h2 className="m-0 font-display text-xl font-semibold text-text">{labels.practice}</h2>
                <ol className="m-0 flex flex-col gap-1.5 ps-6 text-[16px]">
                  {b.steps.map((s) => <li key={s}>{rich(s)}</li>)}
                </ol>
                {b.notation && <NotationExample notation={b.notation} caption={b.caption} tempo={b.tempo} toggleNames labels={labels} />}
              </section>
            );
        }
      })}
    </div>
  );
}
