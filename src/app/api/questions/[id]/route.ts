import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.text === "string") data.text = body.text;
  if (Array.isArray(body.options)) data.options = JSON.stringify(body.options);
  if (typeof body.correctOptionIndex === "number") data.correctOptionIndex = body.correctOptionIndex;

  const question = await prisma.question.update({ where: { id }, data });
  return NextResponse.json(question);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
