import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractTextFromPdf } from "@/lib/pdf";
import { saveTrilhaPdf } from "@/lib/uploads";
import { runTrilhaGeneration } from "@/lib/trilha-generation";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const questionsPerAulaRaw = Number(formData.get("questionsPerAula") ?? 3);
  const questionsPerAula = Number.isFinite(questionsPerAulaRaw) && questionsPerAulaRaw > 0 ? Math.floor(questionsPerAulaRaw) : 3;
  const file = formData.get("pdf");

  if (!title) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo PDF é obrigatório." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Extração de texto best-effort: usada pelos providers anthropic/ollama.
  // Alguns PDFs válidos (escaneados, ou com recursos que a lib pdf-parse não
  // suporta) falham aqui — não é fatal, o provider "acp" lê o arquivo
  // original direto, sem depender desse texto extraído.
  let sourceText = "";
  try {
    sourceText = await extractTextFromPdf(buffer);
  } catch {
    sourceText = "";
  }

  const trilha = await prisma.trilha.create({
    data: {
      title,
      description,
      questionsPerAula,
      sourceFileName: file.name,
      sourceText,
      status: "GENERATING",
      createdById: session.user.id,
    },
  });

  const sourceFilePath = await saveTrilhaPdf(trilha.id, buffer);
  await prisma.trilha.update({ where: { id: trilha.id }, data: { sourceFilePath } });

  await runTrilhaGeneration(trilha.id);

  return NextResponse.json({ id: trilha.id });
}
