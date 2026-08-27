import { prisma } from "@/lib/db";

const SETTINGS_ID = "singleton";

export type AiSettings = {
  aiProvider: "acp" | "anthropic" | "ollama";
  anthropicApiKey: string | null;
  anthropicModel: string | null;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
};

/**
 * Lê a configuração de IA salva pelo admin no banco. Campos não preenchidos
 * caem para as variáveis de ambiente (compatibilidade com deploys que só
 * usam .env, sem precisar passar pela tela de configurações).
 */
export async function getAiSettings(): Promise<AiSettings> {
  const row = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });

  return {
    aiProvider: (row?.aiProvider as AiSettings["aiProvider"]) || (process.env.AI_PROVIDER as AiSettings["aiProvider"]) || "acp",
    anthropicApiKey: row?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null,
    anthropicModel: row?.anthropicModel || process.env.ANTHROPIC_MODEL || null,
    ollamaBaseUrl: row?.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || null,
    ollamaModel: row?.ollamaModel || process.env.OLLAMA_MODEL || null,
  };
}

export async function updateAiSettings(data: Partial<Omit<AiSettings, "aiProvider">> & { aiProvider?: string }) {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}
