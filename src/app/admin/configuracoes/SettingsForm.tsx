"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Provider = "acp" | "anthropic" | "ollama";

type Settings = {
  aiProvider: Provider;
  anthropicApiKey: string | null;
  anthropicModel: string | null;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
};

const PROVIDER_OPTIONS: { value: Provider; label: string; description: string }[] = [
  {
    value: "acp",
    label: "ACP (Claude local)",
    description:
      "Usa o Claude rodando localmente via Agent Client Protocol, reaproveitando o login do `claude` já feito na máquina do servidor. Não precisa de API key.",
  },
  {
    value: "anthropic",
    label: "Anthropic API",
    description: "Usa a API da Anthropic diretamente. Precisa de uma API key.",
  },
  {
    value: "ollama",
    label: "Ollama (modelo local)",
    description: "Usa um modelo rodando localmente via Ollama. Não precisa de API key, mas precisa do Ollama instalado e com um modelo baixado.",
  },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [aiProvider, setAiProvider] = useState<Provider>(initial.aiProvider);
  const [anthropicApiKey, setAnthropicApiKey] = useState(initial.anthropicApiKey ?? "");
  const [anthropicModel, setAnthropicModel] = useState(initial.anthropicModel ?? "claude-sonnet-5");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(initial.ollamaBaseUrl ?? "http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(initial.ollamaModel ?? "");

  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOllamaModels() {
    setLoadingModels(true);
    setModelsError(null);
    try {
      const res = await fetch(`/api/settings/ollama-models?baseUrl=${encodeURIComponent(ollamaBaseUrl)}`);
      const data = await res.json();
      if (!res.ok) {
        setModelsError(data.error ?? "Não foi possível buscar os modelos.");
        return;
      }
      setOllamaModels(data.models);
      if (data.models.length > 0 && !ollamaModel) {
        setOllamaModel(data.models[0]);
      }
    } finally {
      setLoadingModels(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider,
          anthropicApiKey,
          anthropicModel,
          ollamaBaseUrl,
          ollamaModel,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar as configurações.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Provedor de IA</h2>
        <div className="space-y-2">
          {PROVIDER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                aiProvider === opt.value ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="aiProvider"
                checked={aiProvider === opt.value}
                onChange={() => setAiProvider(opt.value)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                <p className="text-xs text-slate-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {aiProvider === "anthropic" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Configuração da Anthropic API</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">API key</label>
            <input
              type="password"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Modelo</label>
            <input
              value={anthropicModel}
              onChange={(e) => setAnthropicModel(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
        </div>
      )}

      {aiProvider === "ollama" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">Configuração do Ollama</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">URL do servidor Ollama</label>
            <input
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Modelo</label>
            <div className="flex gap-2">
              {ollamaModels.length > 0 ? (
                <select
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  {!ollamaModels.includes(ollamaModel) && ollamaModel && (
                    <option value={ollamaModel}>{ollamaModel}</option>
                  )}
                  {ollamaModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="ex: llama3.1"
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              )}
              <button
                type="button"
                onClick={fetchOllamaModels}
                disabled={loadingModels}
                className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingModels ? "Buscando..." : "Buscar modelos instalados"}
              </button>
            </div>
            {modelsError && <p className="mt-1 text-xs text-red-600">{modelsError}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
        {saved && <span className="text-sm text-green-700">Salvo — já vale para a próxima geração.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
