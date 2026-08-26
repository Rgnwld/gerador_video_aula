import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProgressBar } from "@/components/ProgressBar";
import { computeTrilhaProgress } from "@/lib/progress";

export default async function AdminAlunoDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const student = await prisma.user.findUnique({ where: { id: userId } });
  if (!student || student.role !== "STUDENT") {
    notFound();
  }

  const trilhas = await prisma.trilha.findMany({
    where: { status: "READY" },
    include: { aulas: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const progresso = await prisma.aulaProgress.findMany({
    where: { userId, aulaId: { in: trilhas.flatMap((t) => t.aulas.map((a) => a.id)) } },
  });
  const progressoPorAula = new Map(progresso.map((p) => [p.aulaId, p]));

  return (
    <div>
      <Link href="/admin/alunos" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-slate-900">{student.name}</h1>
      <p className="mb-6 text-sm text-slate-500">{student.email}</p>

      <div className="space-y-6">
        {trilhas.map((trilha) => {
          const trilhaProgresso = trilha.aulas
            .map((a) => progressoPorAula.get(a.id))
            .filter((p): p is NonNullable<typeof p> => !!p);
          const { percent, aulasCompletas, totalAulas } = computeTrilhaProgress(
            trilha.aulas.length,
            trilhaProgresso
          );

          return (
            <div key={trilha.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{trilha.title}</h2>
                <span className="text-xs text-slate-500">
                  {aulasCompletas}/{totalAulas} · {percent}%
                </span>
              </div>
              <div className="mb-4 max-w-sm">
                <ProgressBar percent={percent} />
              </div>
              <ul className="space-y-1 text-sm">
                {trilha.aulas.map((aula) => {
                  const p = progressoPorAula.get(aula.id);
                  return (
                    <li key={aula.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50">
                      <span className="text-slate-700">{aula.title}</span>
                      <span className="text-xs text-slate-500">
                        {p?.videoCompleted ? "Vídeo ✓" : "Vídeo pendente"} ·{" "}
                        {p?.quizCompleted ? `Quiz ${p.quizScore}%` : "Quiz pendente"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
