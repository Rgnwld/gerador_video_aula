import Anthropic from "@anthropic-ai/sdk";
import { EMIT_TRILHA_JSON_SCHEMA, trilhaGenerationSchema, type GeneratedAula } from "./schema";
import { buildTrilhaPrompt } from "./prompt";

const EMIT_TRILHA_TOOL: Anthropic.Tool = {
  name: "emit_trilha",
  description:
    "Emite a lista estruturada e ordenada de aulas de uma trilha de aprendizagem, geradas a partir do conteúdo de um PDF profissional.",
  input_schema: EMIT_TRILHA_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
};

export async function generateTrilhaAulasWithAnthropic(params: {
  trilhaTitle: string;
  sourceText: string;
  questionsPerAula: number;
  anthropicApiKey?: string | null;
  anthropicModel?: string | null;
}): Promise<GeneratedAula[]> {
  const anthropic = new Anthropic({ apiKey: params.anthropicApiKey || process.env.ANTHROPIC_API_KEY });
  const prompt = buildTrilhaPrompt(params);

  const response = await anthropic.messages.create({
    model: params.anthropicModel || "claude-sonnet-5",
    max_tokens: 8192,
    tools: [EMIT_TRILHA_TOOL],
    tool_choice: { type: "tool", name: "emit_trilha" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("A IA (Anthropic) não retornou uma resposta estruturada válida.");
  }

  const parsed = trilhaGenerationSchema.parse(toolUse.input);
  return parsed.aulas.map((aula) => ({
    ...aula,
    questions: aula.questions.slice(0, params.questionsPerAula),
  }));
}
