import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAulaVideo, cancelAulaVideo } from "@/lib/video/pipeline";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const aula = await prisma.aula.findUnique({ where: { id } });
  if (!aula) {
    return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  }
  if (aula.videoStatus === "GENERATING") {
    return NextResponse.json({ error: "Já existe uma geração de vídeo em andamento para esta aula." }, { status: 409 });
  }

  await prisma.aula.update({
    where: { id },
    data: { videoStatus: "GENERATING", videoError: null },
  });

  // Fire-and-forget: roda em segundo plano no processo do servidor Next.js.
  // Não funciona em ambientes serverless (a função terminaria antes do fim);
  // ok para next dev/start de longa duração.
  generateAulaVideo(id).catch(() => {});

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const aula = await prisma.aula.findUnique({ where: { id } });
  if (!aula) {
    return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  }
  if (aula.videoStatus !== "GENERATING") {
    return NextResponse.json({ error: "Nenhuma geração em andamento para esta aula." }, { status: 409 });
  }

  // Mata o processo de verdade, se houver um rodando neste servidor. Se não
  // houver (ex: o status ficou travado por um reinício do servidor no meio
  // de uma geração anterior), ainda assim libera o status para o admin poder
  // tentar de novo.
  const wasRunning = cancelAulaVideo(id);

  await prisma.aula.update({
    where: { id },
    data: {
      videoStatus: "FAILED",
      videoError: wasRunning
        ? "Cancelado pelo administrador."
        : "Cancelado (nenhum processo de geração foi encontrado — provavelmente o servidor foi reiniciado no meio da geração anterior).",
    },
  });

  return NextResponse.json({ ok: true });
}
