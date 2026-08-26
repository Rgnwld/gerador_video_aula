import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeTrilhaProgress } from "@/lib/progress";
import { TrilhaCard } from "@/components/TrilhaCard";
import { ProgressBar } from "@/components/ProgressBar";

export default async function AlunoDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const trilhas = await prisma.trilha.findMany({
    where: { status: "READY" },
    include: { aulas: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  const aulaIds = trilhas.flatMap((t) => t.aulas.map((a) => a.id));
  const progresso = await prisma.aulaProgress.findMany({
    where: { userId, aulaId: { in: aulaIds } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Trilhas disponíveis</h1>

      {trilhas.length === 0 && (
        <p className="text-slate-500">Nenhuma trilha disponível no momento.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trilhas.map((trilha) => {
          const trilhaProgresso = progresso.filter((p) =>
            trilha.aulas.some((a) => a.id === p.aulaId)
          );
          const { percent, aulasCompletas, totalAulas } = computeTrilhaProgress(
            trilha.aulas.length,
            trilhaProgresso
          );

          return (
            <TrilhaCard
              key={trilha.id}
              href={`/aluno/trilhas/${trilha.id}`}
              title={trilha.title}
              description={trilha.description}
              footer={
                <div className="space-y-1">
                  <ProgressBar percent={percent} />
                  <p className="text-xs text-slate-500">
                    {aulasCompletas}/{totalAulas} aulas concluídas
                  </p>
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
