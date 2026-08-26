import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProgressBar } from "@/components/ProgressBar";

export default async function AdminAlunosPage() {
  const [students, totalAulas] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            progresso: { where: { videoCompleted: true, quizCompleted: true } },
          },
        },
      },
    }),
    prisma.aula.count({ where: { trilha: { status: "READY" } } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Alunos</h1>

      {students.length === 0 && <p className="text-slate-500">Nenhum aluno cadastrado ainda.</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Progresso geral</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => {
              const percent = totalAulas > 0 ? Math.round((student._count.progresso / totalAulas) * 100) : 0;
              return (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                  <td className="px-4 py-3 text-slate-500">{student.email}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[160px] space-y-1">
                      <ProgressBar percent={percent} />
                      <p className="text-xs text-slate-500">
                        {student._count.progresso}/{totalAulas} aulas · {percent}%
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/alunos/${student.id}`} className="text-brand-600 hover:underline">
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
