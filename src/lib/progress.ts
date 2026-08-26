export type AulaProgressLike = {
  aulaId: string;
  videoCompleted: boolean;
  quizCompleted: boolean;
  quizScore: number | null;
};

export function computeTrilhaProgress(totalAulas: number, progresso: AulaProgressLike[]) {
  if (totalAulas === 0) {
    return { percent: 0, aulasCompletas: 0, totalAulas: 0 };
  }
  const aulasCompletas = progresso.filter((p) => p.videoCompleted && p.quizCompleted).length;
  const percent = Math.round((aulasCompletas / totalAulas) * 100);
  return { percent, aulasCompletas, totalAulas };
}
