import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id: aulaId } = await params;
  const count = await prisma.question.count({ where: { aulaId } });

  const question = await prisma.question.create({
    data: {
      aulaId,
      order: count,
      text: "Nova pergunta",
      options: JSON.stringify(["Alternativa 1", "Alternativa 2", "Alternativa 3", "Alternativa 4"]),
      correctOptionIndex: 0,
    },
  });

  return NextResponse.json(question);
}
