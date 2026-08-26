import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runAcpPrompt } from "@/lib/acp/client";
import { trilhaGenerationSchema, type GeneratedAula } from "./schema";
import { buildTrilhaPromptForFile } from "./prompt";
import { extractJson } from "./extract-json";

export async function generateTrilhaAulasWithAcp(params: {
  trilhaTitle: string;
  sourceFilePath?: string | null;
  questionsPerAula: number;
}): Promise<GeneratedAula[]> {
  const { trilhaTitle, sourceFilePath, questionsPerAula } = params;

  if (!sourceFilePath) {
    throw new Error("Nenhum PDF de origem salvo para esta trilha (necessário para o provider ACP).");
  }

  const absoluteSourcePath = path.join(process.cwd(), sourceFilePath);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "trilha-acp-"));
  const pdfFileName = "material.pdf";

  try {
    await fs.copyFile(absoluteSourcePath, path.join(workDir, pdfFileName));

    const prompt = buildTrilhaPromptForFile({ trilhaTitle, pdfFileName, questionsPerAula });

    const { text } = await runAcpPrompt({
      cwd: workDir,
      prompt,
      timeoutMs: 8 * 60_000,
    });

    const json = extractJson(text);
    const parsed = trilhaGenerationSchema.parse(json);

    return parsed.aulas.map((aula) => ({
      ...aula,
      questions: aula.questions.slice(0, questionsPerAula),
    }));
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
