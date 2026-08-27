import type { GeneratedAula } from "./schema";
import { getAiSettings } from "@/lib/settings";

export type { GeneratedAula };

export async function generateTrilhaAulas(params: {
  trilhaTitle: string;
  sourceText: string;
  sourceFilePath?: string | null;
  questionsPerAula: number;
}): Promise<GeneratedAula[]> {
  const settings = await getAiSettings();
  const provider = settings.aiProvider.toLowerCase();

  if (provider === "acp") {
    const { generateTrilhaAulasWithAcp } = await import("./acp-provider");
    return generateTrilhaAulasWithAcp(params);
  }

  if (provider === "ollama") {
    const { generateTrilhaAulasWithOllama } = await import("./ollama-provider");
    return generateTrilhaAulasWithOllama({
      ...params,
      ollamaBaseUrl: settings.ollamaBaseUrl,
      ollamaModel: settings.ollamaModel,
    });
  }

  if (provider === "anthropic") {
    const { generateTrilhaAulasWithAnthropic } = await import("./anthropic-provider");
    return generateTrilhaAulasWithAnthropic({
      ...params,
      anthropicApiKey: settings.anthropicApiKey,
      anthropicModel: settings.anthropicModel,
    });
  }

  throw new Error(`Provedor de IA desconhecido: "${provider}". Use "anthropic", "ollama" ou "acp".`);
}
