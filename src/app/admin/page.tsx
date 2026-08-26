import Link from "next/link";
import { prisma } from "@/lib/db";
import { TrilhaCard } from "@/components/TrilhaCard";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  READY: { label: "Pronta", className: "bg-green-100 text-green-700" },
  GENERATING: { label: "Gerando...", className: "bg-amber-100 text-amber-700" },
  FAILED: { label: "Falhou", className: "bg-red-100 text-red-700" },
};

export default async function AdminDashboardPage() {
  const trilhas = await prisma.trilha.findMany({
    include: { _count: { select: { aulas: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Trilhas</h1>
        <Link
          href="/admin/trilhas/novo"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nova trilha
        </Link>
      </div>

      {trilhas.length === 0 && <p className="text-slate-500">Nenhuma trilha criada ainda.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trilhas.map((trilha) => {
          const status = STATUS_LABEL[trilha.status];
          return (
            <TrilhaCard
              key={trilha.id}
              href={`/admin/trilhas/${trilha.id}`}
              title={trilha.title}
              description={trilha.description}
              badge={
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              }
              footer={<p className="text-xs text-slate-500">{trilha._count.aulas} aula(s)</p>}
            />
          );
        })}
      </div>
    </div>
  );
}
