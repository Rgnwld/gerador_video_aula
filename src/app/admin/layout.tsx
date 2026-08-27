import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold text-slate-900">
              Painel Administrativo
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-slate-600 hover:text-brand-600">
                Trilhas
              </Link>
              <Link href="/admin/alunos" className="text-slate-600 hover:text-brand-600">
                Alunos
              </Link>
              <Link href="/admin/configuracoes" className="text-slate-600 hover:text-brand-600">
                Configurações
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{session?.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
