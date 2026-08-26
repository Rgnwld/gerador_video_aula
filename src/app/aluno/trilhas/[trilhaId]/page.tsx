import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProgressBar } from "@/components/ProgressBar";
import { computeTrilhaProgress } from "@/lib/progress";

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Iniciante",
  2: "Básico",
  3: "Intermediário",
  4: "Avançado",
  5: "Especialista",
};

export default async function TrilhaDetailPage({
  params,
}: {
  params: Promise<{ trilhaId: string }>;
}) {
  const { trilhaId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const trilha = await prisma.trilha.findUnique({
    where: { id: trilhaId },
    include: { aulas: { orderBy: { order: "asc" } } },
  });

  if (!trilha || trilha.status !== "READY") {
    notFound();
  }

  const progresso = await prisma.aulaProgress.findMany({
    where: { userId, aulaId: { in: trilha.aulas.map((a) => a.id) } },
  });
  const progressoPorAula = new Map(progresso.map((p) => [p.aulaId, p]));
  const { percent, aulasCompletas, totalAulas } = computeTrilhaProgress(trilha.aulas.length, progresso);

  return (
    <div>
      <Link href="/aluno" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-slate-900">{trilha.title}</h1>
      {trilha.description && <p className="mb-4 text-slate-500">{trilha.description}</p>}

      <div className="mb-6 max-w-sm space-y-1">
        <ProgressBar percent={percent} />
        <p className="text-xs text-slate-500">
          {aulasCompletas}/{totalAulas} aulas concluídas ({percent}%)
        </p>
      </div>

      <ol className="space-y-3">
        {trilha.aulas.map((aula, idx) => {
          const p = progressoPorAula.get(aula.id);
          const done = p?.videoCompleted && p?.quizCompleted;
          return (
            <li key={aula.id}>
              <Link
                href={`/aluno/trilhas/${trilha.id}/aulas/${aula.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-brand-300"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                      done ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {done ? "✓" : idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{aula.title}</p>
                    <p className="text-xs text-slate-500">
                      {DIFFICULTY_LABEL[aula.difficulty] ?? `Nível ${aula.difficulty}`}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {p?.videoCompleted ? "Vídeo assistido" : "Vídeo pendente"} ·{" "}
                  {p?.quizCompleted ? `Quiz: ${p.quizScore}%` : "Quiz pendente"}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
