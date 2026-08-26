"use client";

import { useState } from "react";

export type QuizQuestion = {
  id: string;
  text: string;
  options: string[];
};

export function QuizPlayer({
  questions,
  disabled,
  initialScore,
  onSubmit,
}: {
  questions: QuizQuestion[];
  disabled?: boolean;
  initialScore?: number | null;
  onSubmit: (answers: Record<string, number>) => Promise<number>;
}) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(initialScore ?? null);

  const allAnswered = questions.every((q) => selected[q.id] !== undefined);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await onSubmit(selected);
      setScore(result);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {questions.map((question, qi) => (
        <div key={question.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 font-medium text-slate-900">
            {qi + 1}. {question.text}
          </p>
          <div className="space-y-2">
            {question.options.map((option, oi) => (
              <label
                key={oi}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  selected[question.id] === oi
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={selected[question.id] === oi}
                  onChange={() => setSelected((s) => ({ ...s, [question.id]: oi }))}
                  disabled={disabled || score !== null}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      ))}

      {score === null ? (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting || disabled}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Enviando..." : "Enviar respostas"}
        </button>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Quiz concluído! Nota: {score}%
        </div>
      )}
    </div>
  );
}
