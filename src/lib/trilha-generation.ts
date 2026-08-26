import { prisma } from "@/lib/db";
import { generateTrilhaAulas } from "@/lib/ai";

/**
 * Chama a IA para gerar as aulas de uma trilha a partir do seu sourceText salvo,
 * substituindo quaisquer aulas/perguntas existentes. Usado tanto na criação
 * quanto em "refazer trilha".
 */
export async function runTrilhaGeneration(trilhaId: string) {
  const trilha = await prisma.trilha.findUniqueOrThrow({ where: { id: trilhaId } });

  if (!trilha.sourceText && !trilha.sourceFilePath) {
    await prisma.trilha.update({
      where: { id: trilhaId },
      data: { status: "FAILED", errorMessage: "Nenhum PDF de origem disponível para gerar a trilha." },
    });
    return;
  }

  try {
    const aulas = await generateTrilhaAulas({
      trilhaTitle: trilha.title,
      sourceText: trilha.sourceText ?? "",
      sourceFilePath: trilha.sourceFilePath,
      questionsPerAula: trilha.questionsPerAula,
    });

    await prisma.$transaction(async (tx) => {
      await tx.aula.deleteMany({ where: { trilhaId } });

      for (let i = 0; i < aulas.length; i++) {
        const aula = aulas[i];
        await tx.aula.create({
          data: {
            trilhaId,
            order: i,
            title: aula.title,
            difficulty: aula.difficulty,
            summary: aula.summary,
            videoScript: aula.videoScript,
            questions: {
              create: aula.questions.map((q, qi) => ({
                order: qi,
                text: q.text,
                options: JSON.stringify(q.options),
                correctOptionIndex: q.correctOptionIndex,
              })),
            },
          },
        });
      }

      await tx.trilha.update({
        where: { id: trilhaId },
        data: { status: "READY", errorMessage: null },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar trilha.";
    await prisma.trilha.update({
      where: { id: trilhaId },
      data: { status: "FAILED", errorMessage: message },
    });
  }
}
