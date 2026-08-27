"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
};

type VideoStatus = "NONE" | "GENERATING" | "READY" | "FAILED";

type Aula = {
  id: string;
  order: number;
  title: string;
  difficulty: number;
  summary: string;
  videoScript: string;
  videoStatus: VideoStatus;
  videoUrl: string | null;
  videoError: string | null;
  questions: Question[];
};

type Trilha = {
  id: string;
  title: string;
  description: string;
  status: "GENERATING" | "READY" | "FAILED";
  errorMessage: string | null;
  questionsPerAula: number;
};

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Falha ao salvar.");
  return res.json();
}

function QuestionEditor({ aulaId, question }: { aulaId: string; question: Question }) {
  const router = useRouter();
  const [text, setText] = useState(question.text);
  const [options, setOptions] = useState(question.options);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(question.correctOptionIndex);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await patchJson(`/api/questions/${question.id}`, { text, options, correctOptionIndex });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Remover esta pergunta?")) return;
    await fetch(`/api/questions/${question.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      <div className="mb-2 space-y-1">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={correctOptionIndex === i}
              onChange={() => setCorrectOptionIndex(i)}
              title="Marcar como correta"
            />
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar pergunta"}
        </button>
        <button onClick={remove} className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
          Remover
        </button>
      </div>
    </div>
  );
}

const VIDEO_STATUS_LABEL: Record<VideoStatus, string> = {
  NONE: "Nenhum vídeo gerado ainda",
  GENERATING: "Gerando vídeo (pode levar vários minutos)...",
  READY: "Vídeo pronto",
  FAILED: "Falha ao gerar vídeo",
};

function VideoSection({
  aulaId,
  initial,
}: {
  aulaId: string;
  initial: Pick<Aula, "videoStatus" | "videoUrl" | "videoError">;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<VideoStatus>(initial.videoStatus);
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl);
  const [videoError, setVideoError] = useState(initial.videoError);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (status !== "GENERATING") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/aulas/${aulaId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.videoStatus !== "GENERATING") {
        setStatus(data.videoStatus);
        setVideoUrl(data.videoUrl);
        setVideoError(data.videoError);
        router.refresh();
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [status, aulaId, router]);

  async function generate() {
    setStarting(true);
    try {
      const res = await fetch(`/api/aulas/${aulaId}/generate-video`, { method: "POST" });
      if (res.ok) {
        setStatus("GENERATING");
        setVideoError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setVideoError(data.error ?? "Não foi possível iniciar a geração do vídeo.");
      }
    } finally {
      setStarting(false);
    }
  }

  async function cancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/aulas/${aulaId}/generate-video`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("FAILED");
        setVideoError("Cancelado pelo administrador.");
        router.refresh();
      } else {
        setVideoError(data.error ?? "Não foi possível cancelar a geração.");
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vídeo (HyperFrames)</h4>
      <p className="mb-2 text-xs text-slate-500">{VIDEO_STATUS_LABEL[status]}</p>

      {status === "READY" && videoUrl && (
        <video controls src={videoUrl} className="mb-2 w-full max-w-md rounded-md border border-slate-200" />
      )}
      {status === "FAILED" && videoError && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{videoError}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={starting || status === "GENERATING"}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {status === "GENERATING" ? "Gerando..." : status === "READY" ? "Gerar novamente" : "Gerar vídeo"}
        </button>
        {status === "GENERATING" && (
          <button
            onClick={cancel}
            disabled={cancelling}
            className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {cancelling ? "Cancelando..." : "Cancelar geração"}
          </button>
        )}
      </div>
    </div>
  );
}

function AulaEditor({ aula }: { aula: Aula }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(aula.title);
  const [summary, setSummary] = useState(aula.summary);
  const [videoScript, setVideoScript] = useState(aula.videoScript);
  const [saving, setSaving] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await patchJson(`/api/aulas/${aula.id}`, { title, summary, videoScript });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion() {
    setAddingQuestion(true);
    try {
      await fetch(`/api/aulas/${aula.id}/questions`, { method: "POST" });
      router.refresh();
    } finally {
      setAddingQuestion(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <span className="mr-2 text-xs font-medium text-slate-400">#{aula.order + 1}</span>
          <span className="font-medium text-slate-900">{aula.title}</span>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            Dificuldade {aula.difficulty}
          </span>
        </div>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Resumo</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Roteiro do vídeo</label>
            <textarea
              value={videoScript}
              onChange={(e) => setVideoScript(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar aula"}
          </button>

          <VideoSection
            aulaId={aula.id}
            initial={{ videoStatus: aula.videoStatus, videoUrl: aula.videoUrl, videoError: aula.videoError }}
          />

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Perguntas ({aula.questions.length})
            </h4>
            <div className="space-y-3">
              {aula.questions.map((q) => (
                <QuestionEditor key={q.id} aulaId={aula.id} question={q} />
              ))}
            </div>
            <button
              onClick={addQuestion}
              disabled={addingQuestion}
              className="mt-3 rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              + Adicionar pergunta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TrilhaEditor({ trilha, aulas }: { trilha: Trilha; aulas: Aula[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(trilha.title);
  const [description, setDescription] = useState(trilha.description);
  const [savingMeta, setSavingMeta] = useState(false);

  const [regenFile, setRegenFile] = useState<File | null>(null);
  const [questionsPerAula, setQuestionsPerAula] = useState(trilha.questionsPerAula);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  async function saveMeta() {
    setSavingMeta(true);
    try {
      await patchJson(`/api/trilhas/${trilha.id}`, { title, description });
      router.refresh();
    } finally {
      setSavingMeta(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    setRegenError(null);
    try {
      const formData = new FormData();
      formData.append("questionsPerAula", String(questionsPerAula));
      if (regenFile) formData.append("pdf", regenFile);

      const res = await fetch(`/api/trilhas/${trilha.id}/regenerate`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRegenError(data.error ?? "Não foi possível refazer a trilha.");
        return;
      }
      router.refresh();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={saveMeta}
            disabled={savingMeta}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {savingMeta ? "Salvando..." : "Salvar dados da trilha"}
          </button>
        </div>

        {trilha.status === "FAILED" && trilha.errorMessage && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Falha ao gerar: {trilha.errorMessage}
          </p>
        )}

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Refazer trilha</h3>
          <p className="mb-3 text-xs text-slate-500">
            Reprocessa o conteúdo com a IA, substituindo todas as aulas e perguntas atuais. Opcionalmente
            envie um novo PDF para trocar o conteúdo de origem.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Perguntas por aula</label>
              <input
                type="number"
                min={1}
                max={10}
                value={questionsPerAula}
                onChange={(e) => setQuestionsPerAula(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Novo PDF (opcional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setRegenFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="rounded-md border border-brand-600 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-60"
            >
              {regenerating ? "Refazendo (IA)..." : "Refazer trilha"}
            </button>
          </div>
          {regenError && <p className="mt-2 text-xs text-red-600">{regenError}</p>}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Aulas ({aulas.length})</h2>
        <div className="space-y-3">
          {aulas.map((aula) => (
            <AulaEditor key={aula.id} aula={aula} />
          ))}
        </div>
      </div>
    </div>
  );
}
