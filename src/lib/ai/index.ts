import type { GeneratedAula } from "./schema";

export type { GeneratedAula };

export async function generateTrilhaAulas(params: {
  trilhaTitle: string;
  sourceText: string;
  sourceFilePath?: string | null;
  questionsPerAula: number;
}): Promise<GeneratedAula[]> {
  const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();

  if (provider === "acp") {
    const { generateTrilhaAulasWithAcp } = await import("./acp-provider");
    return generateTrilhaAulasWithAcp(params);
  }

  if (provider === "ollama") {
    const { generateTrilhaAulasWithOllama } = await import("./ollama-provider");
    return generateTrilhaAulasWithOllama(params);
  }

  if (provider === "anthropic") {
    const { generateTrilhaAulasWithAnthropic } = await import("./anthropic-provider");
    return generateTrilhaAulasWithAnthropic(params);
  }

  throw new Error(`AI_PROVIDER desconhecido: "${provider}". Use "anthropic", "ollama" ou "acp".`);
}
