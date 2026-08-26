import { EMIT_TRILHA_JSON_SCHEMA, trilhaGenerationSchema, type GeneratedAula } from "./schema";
import { buildTrilhaPrompt } from "./prompt";

const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.1";

export async function generateTrilhaAulasWithOllama(params: {
  trilhaTitle: string;
  sourceText: string;
  questionsPerAula: number;
}): Promise<GeneratedAula[]> {
  const prompt = buildTrilhaPrompt(params);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        format: EMIT_TRILHA_JSON_SCHEMA,
        stream: false,
      }),
    });
  } catch {
    throw new Error(
      `Não foi possível conectar ao Ollama em ${BASE_URL}. Verifique se o Ollama está rodando (ollama serve) e se o modelo "${MODEL}" foi baixado (ollama pull ${MODEL}).`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Erro do Ollama (${response.status}): ${body || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("O Ollama não retornou uma resposta estruturada válida.");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("A resposta do Ollama não é um JSON válido.");
  }

  const parsed = trilhaGenerationSchema.parse(json);
  return parsed.aulas.map((aula) => ({
    ...aula,
    questions: aula.questions.slice(0, params.questionsPerAula),
  }));
}
