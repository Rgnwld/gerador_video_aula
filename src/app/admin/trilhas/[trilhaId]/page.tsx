import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TrilhaEditor } from "./TrilhaEditor";

export default async function AdminTrilhaPage({
  params,
}: {
  params: Promise<{ trilhaId: string }>;
}) {
  const { trilhaId } = await params;

  const trilha = await prisma.trilha.findUnique({
    where: { id: trilhaId },
    include: { aulas: { orderBy: { order: "asc" }, include: { questions: { orderBy: { order: "asc" } } } } },
  });

  if (!trilha) {
    notFound();
  }

  return (
    <div>
      <Link href="/admin" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>

      {trilha.status === "GENERATING" && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A IA está gerando as aulas desta trilha. Atualize a página em alguns instantes.
        </div>
      )}

      <TrilhaEditor
        trilha={{
          id: trilha.id,
          title: trilha.title,
          description: trilha.description,
          status: trilha.status as "GENERATING" | "READY" | "FAILED",
          errorMessage: trilha.errorMessage,
          questionsPerAula: trilha.questionsPerAula,
        }}
        aulas={trilha.aulas.map((aula) => ({
          id: aula.id,
          order: aula.order,
          title: aula.title,
          difficulty: aula.difficulty,
          summary: aula.summary,
          videoScript: aula.videoScript,
          videoStatus: aula.videoStatus as "NONE" | "GENERATING" | "READY" | "FAILED",
          videoUrl: aula.videoUrl,
          videoError: aula.videoError,
          questions: aula.questions.map((q) => ({
            id: q.id,
            text: q.text,
            options: JSON.parse(q.options) as string[],
            correctOptionIndex: q.correctOptionIndex,
          })),
        }))}
      />
    </div>
  );
}
