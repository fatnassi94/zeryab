"use client";

import { useState, useTransition } from "react";
import { submitQuiz, type QuizResult } from "../../actions";

type Question = { id: string; prompt: string; options: string[] };

type Labels = {
  quiz: string;
  questionOf: string;
  options: string;
  correct: string;
  yourPick: string;
  submit: string;
  score: string;
  retry: string;
  signInForQuiz: string;
  prev: string;
  next: string;
};

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

export function Quiz({ exerciseId, title, questions, labels, signedIn, numberFormat }: {
  exerciseId: string;
  title: string;
  questions: Question[];
  labels: Labels;
  signedIn: boolean;
  numberFormat: string;
}) {
  const nf = new Intl.NumberFormat(numberFormat);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const q = questions[step];
  const isLast = step === questions.length - 1;
  const review = result?.results.find((r) => r.question_id === q.id);

  const submit = () =>
    startTransition(async () => {
      const res = await submitQuiz(exerciseId, answers);
      if ("result" in res && res.result) {
        setResult(res.result);
        setStep(0);
      } else setFailed(true);
    });

  const reset = () => {
    setAnswers({});
    setResult(null);
    setStep(0);
  };

  return (
    <section aria-labelledby={`quiz-${exerciseId}`} className="card flex flex-col gap-4 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`quiz-${exerciseId}`} className="m-0 font-display text-2xl font-semibold">{title || labels.quiz}</h2>
        <span className="text-[13px] text-muted">{fill(labels.questionOf, { n: nf.format(step + 1), total: nf.format(questions.length) })}</span>
      </div>
      <p className="m-0 text-lg font-medium">{q.prompt}</p>
      <div role="group" aria-label={labels.options} className="flex flex-col gap-2.5">
        {q.options.map((label, i) => {
          const picked = answers[q.id] === i;
          let cls = "border-white/12 bg-white/3";
          let mark = "";
          if (review) {
            if (review.correct_option === i) { cls = "border-gold bg-gold/14"; mark = labels.correct; }
            else if (picked) { cls = "border-rose bg-rose/12"; mark = labels.yourPick; }
          } else if (picked) cls = "border-gold bg-gold/10";
          return (
            <button
              key={i}
              type="button"
              disabled={!!result}
              aria-pressed={picked}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-5 text-start text-base text-text ${cls}`}
            >
              <span>{label}</span>
              <span className="text-[13px] font-semibold">{mark}</span>
            </button>
          );
        })}
      </div>

      {review?.explanation && (
        <p className="m-0 rounded-2xl bg-white/5 px-[18px] py-4 text-[15px] leading-[1.8] text-soft">{review.explanation}</p>
      )}
      {result && (
        <p role="status" className="m-0 font-medium text-gold">
          {fill(labels.score, { score: nf.format(result.score), max: nf.format(result.max_score) })}
        </p>
      )}
      {failed && <p role="alert" className="m-0 text-rose">{labels.signInForQuiz}</p>}

      <div className="flex flex-wrap gap-2">
        {step > 0 && (
          <button type="button" className="btn-ghost" aria-label={labels.prev} onClick={() => setStep(step - 1)}>{labels.prev}</button>
        )}
        {!isLast && (
          <button type="button" className="btn-ghost" disabled={!result && answers[q.id] === undefined} onClick={() => setStep(step + 1)}>{labels.next}</button>
        )}
        {isLast && !result && signedIn && (
          <button type="button" className="btn-gold disabled:opacity-60" disabled={pending || answers[q.id] === undefined} onClick={submit}>
            {labels.submit}
          </button>
        )}
        {result && <button type="button" className="btn-ghost" onClick={reset}>{labels.retry}</button>}
      </div>
      {!signedIn && <p className="m-0 text-[13px] text-muted">{labels.signInForQuiz}</p>}
    </section>
  );
}
