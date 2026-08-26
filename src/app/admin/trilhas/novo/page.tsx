"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovaTrilhaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionsPerAula, setQuestionsPerAula] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Selecione um arquivo PDF.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("questionsPerAula", String(questionsPerAula));
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/trilhas", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a trilha.");
        setLoading(false);
        return;
      }
      router.push(`/admin/trilhas/${data.id}`);
    } catch {
      setError("Erro inesperado ao criar a trilha.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Link href="/admin" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Nova trilha</h1>
      <p className="mb-6 text-sm text-slate-500">
        Envie um PDF profissional. A IA irá dividir o conteúdo em aulas detalhadas, ordenadas por
        dificuldade, cada uma com resumo, roteiro de vídeo e questões.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Título da trilha</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Perguntas por aula (padrão 3)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={questionsPerAula}
            onChange={(e) => setQuestionsPerAula(Number(e.target.value))}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">PDF do conteúdo</label>
          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Gerando trilha com IA... isso pode levar um minuto" : "Criar trilha"}
        </button>
      </form>
    </div>
  );
}
