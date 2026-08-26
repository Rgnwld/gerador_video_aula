import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AulaClient } from "./AulaClient";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ trilhaId: string; aulaId: string }>;
}) {
  const { trilhaId, aulaId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const aula = await prisma.aula.findUnique({
    where: { id: aulaId },
    include: { questions: { orderBy: { order: "asc" } }, trilha: true },
  });

  if (!aula || aula.trilhaId !== trilhaId || aula.trilha.status !== "READY") {
    notFound();
  }

  const progress = await prisma.aulaProgress.findUnique({
    where: { userId_aulaId: { userId, aulaId } },
  });

  return (
    <div>
      <Link
        href={`/aluno/trilhas/${trilhaId}`}
        className="mb-4 inline-block text-sm text-brand-600 hover:underline"
      >
        ← Voltar para a trilha
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-slate-900">{aula.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{aula.trilha.title}</p>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Resumo</h2>
        <p className="whitespace-pre-line text-slate-700">{aula.summary}</p>
      </div>

      <AulaClient
        aulaId={aula.id}
        videoUrl={aula.videoStatus === "READY" ? aula.videoUrl : null}
        questions={aula.questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: JSON.parse(q.options) as string[],
        }))}
        initialVideoCompleted={progress?.videoCompleted ?? false}
        initialQuizScore={progress?.quizCompleted ? progress.quizScore ?? 0 : null}
      />
    </div>
  );
}
