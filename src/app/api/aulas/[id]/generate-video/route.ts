import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAulaVideo } from "@/lib/acp/video-generation";

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
