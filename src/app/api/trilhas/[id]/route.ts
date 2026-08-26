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
  const trilha = await prisma.trilha.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, status: true, errorMessage: true, questionsPerAula: true },
  });

  if (!trilha) {
    return NextResponse.json({ error: "Trilha não encontrada." }, { status: 404 });
  }

  return NextResponse.json(trilha);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const data: { title?: string; description?: string } = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.description === "string") data.description = body.description;

  const trilha = await prisma.trilha.update({ where: { id }, data });
  return NextResponse.json(trilha);
}
