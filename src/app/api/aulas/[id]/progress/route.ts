import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id: aulaId } = await params;
  const body = await request.json();
  const userId = session.user.id;

  const existing = await prisma.aulaProgress.findUnique({
    where: { userId_aulaId: { userId, aulaId } },
  });

  const data: {
    videoCompleted?: boolean;
    quizCompleted?: boolean;
    quizScore?: number;
    answers?: string;
  } = {};

  if (typeof body.videoCompleted === "boolean") {
    data.videoCompleted = body.videoCompleted;
  }

  if (body.answers && typeof body.answers === "object") {
    const answers: Record<string, number> = body.answers;
    const questions = await prisma.question.findMany({ where: { aulaId } });

    let correct = 0;
    for (const question of questions) {
      if (answers[question.id] === question.correctOptionIndex) correct++;
    }

    data.quizCompleted = true;
    data.quizScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    data.answers = JSON.stringify(answers);
  }

  const progress = await prisma.aulaProgress.upsert({
    where: { userId_aulaId: { userId, aulaId } },
    create: {
      userId,
      aulaId,
      videoCompleted: data.videoCompleted ?? false,
      quizCompleted: data.quizCompleted ?? false,
      quizScore: data.quizScore,
      answers: data.answers,
    },
    update: data,
  });

  return NextResponse.json({
    ...progress,
    previousQuizScore: existing?.quizScore ?? null,
  });
}
