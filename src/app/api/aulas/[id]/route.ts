import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const aula = await prisma.aula.findUnique({
    where: { id },
    select: { id: true, videoStatus: true, videoUrl: true, videoError: true },
  });
  if (!aula) {
    return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  }
  return NextResponse.json(aula);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.summary === "string") data.summary = body.summary;
  if (typeof body.videoScript === "string") data.videoScript = body.videoScript;
  if (typeof body.difficulty === "number") data.difficulty = body.difficulty;

  const aula = await prisma.aula.update({ where: { id }, data });
  return NextResponse.json(aula);
}
