"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuizPlayer, type QuizQuestion } from "@/components/QuizPlayer";

export function AulaClient({
  aulaId,
  videoUrl,
  questions,
  initialVideoCompleted,
  initialQuizScore,
}: {
  aulaId: string;
  videoUrl: string | null;
  questions: QuizQuestion[];
  initialVideoCompleted: boolean;
  initialQuizScore: number | null;
}) {
  const router = useRouter();
  const [videoCompleted, setVideoCompleted] = useState(initialVideoCompleted);
  const [markingVideo, setMarkingVideo] = useState(false);

  async function markVideoWatched() {
    setMarkingVideo(true);
    try {
      await fetch(`/api/aulas/${aulaId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoCompleted: true }),
      });
      setVideoCompleted(true);
      router.refresh();
    } finally {
      setMarkingVideo(false);
    }
  }

  async function submitQuiz(answers: Record<string, number>) {
    const res = await fetch(`/api/aulas/${aulaId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    router.refresh();
    return data.quizScore as number;
  }

  return (
    <div className="space-y-8">
      <div>
        {videoUrl ? (
          <video controls src={videoUrl} className="aspect-video w-full rounded-xl border border-slate-200 bg-black" />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-slate-400">
            <span className="text-sm">Vídeo da aula (ainda não gerado)</span>
          </div>
        )}
        <div className="mt-3">
          {videoCompleted ? (
            <span className="text-sm font-medium text-green-700">✓ Vídeo marcado como assistido</span>
          ) : (
            <button
              onClick={markVideoWatched}
              disabled={markingVideo}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {markingVideo ? "Salvando..." : "Marcar vídeo como assistido"}
            </button>
          )}
        </div>
      </div>

      {questions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Questões da aula</h2>
          <QuizPlayer questions={questions} initialScore={initialQuizScore} onSubmit={submitQuiz} />
        </div>
      )}
    </div>
  );
}
