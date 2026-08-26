import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractTextFromPdf } from "@/lib/pdf";
import { saveTrilhaPdf } from "@/lib/uploads";
import { runTrilhaGeneration } from "@/lib/trilha-generation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const trilha = await prisma.trilha.findUnique({ where: { id } });
  if (!trilha) {
    return NextResponse.json({ error: "Trilha não encontrada." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let questionsPerAula = trilha.questionsPerAula;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("pdf");
    const questionsPerAulaRaw = formData.get("questionsPerAula");
    if (questionsPerAulaRaw) {
      const n = Number(questionsPerAulaRaw);
      if (Number.isFinite(n) && n > 0) questionsPerAula = Math.floor(n);
    }

    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      let sourceText = "";
      try {
        sourceText = await extractTextFromPdf(buffer);
      } catch {
        sourceText = "";
      }

      const sourceFilePath = await saveTrilhaPdf(id, buffer);
      await prisma.trilha.update({
        where: { id },
        data: { sourceText, sourceFileName: file.name, sourceFilePath },
      });
    }
  }

  await prisma.trilha.update({
    where: { id },
    data: { status: "GENERATING", errorMessage: null, questionsPerAula },
  });

  await runTrilhaGeneration(id);

  return NextResponse.json({ ok: true });
}
