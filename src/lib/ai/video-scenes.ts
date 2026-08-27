import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getAiSettings } from "@/lib/settings";
import { runAcpPrompt } from "@/lib/acp/client";
import { extractJson } from "./extract-json";

const sceneSchema = z.object({
  text: z.string().min(1).max(140),
  durationSeconds: z.number().min(3).max(10),
});

const compositionSchema = z.object({
  designSystem: z.object({
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  storyboard: z.array(sceneSchema).min(4).max(8),
});

export type VideoComposition = z.infer<typeof compositionSchema>;

export type UsageInfo = {
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  raw?: unknown;
};

const JSON_SCHEMA = {
  type: "object",
  properties: {
    designSystem: {
      type: "object",
      properties: {
        backgroundColor: { type: "string", description: "Cor de fundo em hex, ex: #0b0f14" },
        textColor: { type: "string", description: "Cor do texto principal em hex, com bom contraste sobre o fundo" },
        accentColor: { type: "string", description: "Cor de destaque em hex (sublinhado/detalhe)" },
      },
      required: ["backgroundColor", "textColor", "accentColor"],
    },
    storyboard: {
      type: "array",
      description: "Entre 4 e 8 cenas sequenciais, cada uma com um texto curto (frase ou fragmento, no máximo ~140 caracteres) e sua duração em segundos (3 a 10).",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          durationSeconds: { type: "number", minimum: 3, maximum: 10 },
        },
        required: ["text", "durationSeconds"],
      },
    },
  },
  required: ["designSystem", "storyboard"],
} as const;

function buildPrompt(params: { aulaTitle: string; videoScript: string }): string {
  return `Você é um roteirista de vídeos curtos de treinamento corporativo (sem narração — só texto na tela).

Aula: "${params.aulaTitle}"

Roteiro completo da aula (use como base, não repita tudo, extraia só os pontos-chave):
"""
${params.videoScript.slice(0, 6000)}
"""

Transforme isso numa sequência de 4 a 8 cenas de texto curto para vídeo (tipo "kinetic typography"): cada cena é uma frase ou fragmento curto (até ~140 caracteres) que resume um ponto-chave, na ordem lógica do roteiro (gancho → pontos principais → fechamento/chamada para reflexão). Cada cena dura de 3 a 10 segundos (mais tempo para textos mais longos).

Também escolha uma paleta simples de 3 cores em hex (fundo escuro ou claro, texto com bom contraste, uma cor de destaque) que combine com o tema da aula.

Responda com um objeto JSON dentro de um bloco \`\`\`json com este formato exato (nada além dele):
{
  "designSystem": { "backgroundColor": "#hex", "textColor": "#hex", "accentColor": "#hex" },
  "storyboard": [ { "text": "...", "durationSeconds": 5 } ]
}`;
}

async function generateWithAnthropic(
  prompt: string,
  apiKey: string | null,
  model: string | null,
  signal?: AbortSignal
): Promise<{ composition: VideoComposition; usage: UsageInfo }> {
  const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const modelName = model || "claude-sonnet-5";

  const tool: Anthropic.Tool = {
    name: "emit_composition",
    description: "Emite o design system e o storyboard de cenas para um vídeo curto de texto animado.",
    input_schema: JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
  };

  const response = await anthropic.messages.create(
    {
      model: modelName,
      max_tokens: 2048,
      tools: [tool],
      tool_choice: { type: "tool", name: "emit_composition" },
      messages: [{ role: "user", content: prompt }],
    },
    { signal }
  );

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("A IA (Anthropic) não retornou uma resposta estruturada válida.");

  return {
    composition: compositionSchema.parse(toolUse.input),
    usage: {
      provider: "anthropic",
      model: modelName,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
}

async function generateWithOllama(
  prompt: string,
  baseUrl: string | null,
  model: string | null,
  signal?: AbortSignal
): Promise<{ composition: VideoComposition; usage: UsageInfo }> {
  const BASE_URL = baseUrl || "http://localhost:11434";
  const MODEL = model || "llama3.1";

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      format: JSON_SCHEMA,
      stream: false,
    }),
    signal,
  }).catch(() => {
    throw new Error(`Não foi possível conectar ao Ollama em ${BASE_URL}.`);
  });

  if (!response.ok) {
    throw new Error(`Erro do Ollama (${response.status}).`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("O Ollama não retornou uma resposta estruturada válida.");
  }

  return {
    composition: compositionSchema.parse(JSON.parse(content)),
    usage: {
      provider: "ollama",
      model: MODEL,
      inputTokens: data?.prompt_eval_count,
      outputTokens: data?.eval_count,
      raw: { total_duration_ns: data?.total_duration, eval_duration_ns: data?.eval_duration },
    },
  };
}

async function generateWithAcp(
  prompt: string,
  signal?: AbortSignal
): Promise<{ composition: VideoComposition; usage: UsageInfo }> {
  const os = await import("node:os");
  const path = await import("node:path");
  const fs = await import("node:fs/promises");

  // Roda a sessão ACP num diretório vazio e temporário, só para gerar texto —
  // sem dar acesso a Bash/arquivos do projeto de vídeo (isso é feito depois,
  // de forma determinística, pelo pipeline).
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-scenes-acp-"));
  try {
    const { text } = await runAcpPrompt({ cwd: workDir, prompt, timeoutMs: 3 * 60_000, signal });
    const json = extractJson(text);
    return {
      composition: compositionSchema.parse(json),
      usage: { provider: "acp" },
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export async function generateVideoScenes(params: {
  aulaTitle: string;
  videoScript: string;
  signal?: AbortSignal;
}): Promise<{ composition: VideoComposition; usage: UsageInfo }> {
  const settings = await getAiSettings();
  const prompt = buildPrompt(params);

  if (settings.aiProvider === "anthropic") {
    return generateWithAnthropic(prompt, settings.anthropicApiKey, settings.anthropicModel, params.signal);
  }
  if (settings.aiProvider === "ollama") {
    return generateWithOllama(prompt, settings.ollamaBaseUrl, settings.ollamaModel, params.signal);
  }
  return generateWithAcp(prompt, params.signal);
}
