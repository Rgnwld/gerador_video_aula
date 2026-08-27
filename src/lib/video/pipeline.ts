import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { generateVideoScenes } from "@/lib/ai/video-scenes";
import { buildCompositionHtml } from "./composition-template";

const WORK_ROOT = path.join(process.cwd(), ".acp-video-work");
const PUBLIC_VIDEOS_DIR = path.join(process.cwd(), "public", "videos");
const PROJECT_DIR_NAME = "composition";
const OUTPUT_FILE_NAME = "output.mp4";

const activeGenerations = new Map<string, AbortController>();

/** Cancela a geração em andamento para a aula, se houver. Retorna se havia algo pra cancelar. */
export function cancelAulaVideo(aulaId: string): boolean {
  const controller = activeGenerations.get(aulaId);
  if (!controller) return false;
  activeGenerations.delete(aulaId);
  controller.abort();
  return true;
}

type StepTiming = { step: string; ms: number };

function runCli(
  command: string,
  args: string[],
  opts: { cwd: string; signal: AbortSignal; timeoutMs: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { cwd: opts.cwd, signal: opts.signal, timeout: opts.timeoutMs, maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const tail = (stderr || stdout || "").slice(-2000);
          reject(new Error(`${command} ${args.join(" ")} falhou: ${error.message}\n${tail}`));
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

export async function generateAulaVideo(aulaId: string): Promise<void> {
  const aula = await prisma.aula.findUnique({ where: { id: aulaId } });
  if (!aula) return;

  const workDir = path.join(WORK_ROOT, aulaId);
  const projectDir = path.join(workDir, PROJECT_DIR_NAME);
  const controller = new AbortController();
  activeGenerations.set(aulaId, controller);
  const isCurrent = () => activeGenerations.get(aulaId) === controller;

  const timings: StepTiming[] = [];
  const mark = async <T>(step: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      timings.push({ step, ms: Date.now() - start });
    }
  };

  try {
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(workDir, { recursive: true });

    // 1) Scaffold determinístico (sem IA): copia o boilerplate do HyperFrames.
    await mark("scaffold", () =>
      runCli(
        "npx",
        ["hyperframes", "init", PROJECT_DIR_NAME, "--non-interactive", "--example", "blank", "--resolution", "landscape"],
        { cwd: workDir, signal: controller.signal, timeoutMs: 2 * 60_000 }
      )
    );

    // 2) Única chamada de IA (usa o provedor configurado pelo admin): gera o
    // design system + storyboard de cenas a partir do roteiro da aula.
    const { composition, usage } = await mark("scenes", () =>
      generateVideoScenes({ aulaTitle: aula.title, videoScript: aula.videoScript, signal: controller.signal })
    );

    // 3) Escreve a composição HTML final de forma determinística (template
    // fixo, sem IA envolvida em gerar HTML/CSS/JS).
    const html = buildCompositionHtml(composition);
    await fs.writeFile(path.join(projectDir, "index.html"), html, "utf8");

    // 4) Renderiza via CLI, sem preview/check interativo (pipeline não tem
    // humano pra aprovar) — direto pra render, qualidade "standard".
    await mark("render", () =>
      runCli(
        "npx",
        ["hyperframes", "render", "--output", OUTPUT_FILE_NAME, "--quality", "standard"],
        { cwd: projectDir, signal: controller.signal, timeoutMs: 10 * 60_000 }
      )
    );

    // 5) Verifica no disco (não confia em resposta de IA nenhuma nessa etapa
    // — essa etapa é 100% determinística).
    const outputPath = path.join(projectDir, OUTPUT_FILE_NAME);
    const stat = await fs.stat(outputPath);
    if (stat.size === 0) throw new Error("Render produziu um arquivo vazio.");

    await fs.mkdir(PUBLIC_VIDEOS_DIR, { recursive: true });
    await fs.copyFile(outputPath, path.join(PUBLIC_VIDEOS_DIR, `${aulaId}.mp4`));

    if (isCurrent()) {
      console.log(
        `[video] aula=${aulaId} provider=${usage.provider} tokens=${usage.inputTokens ?? "?"}/${usage.outputTokens ?? "?"} timings=${JSON.stringify(timings)}`
      );
      await prisma.aula.update({
        where: { id: aulaId },
        data: { videoStatus: "READY", videoUrl: `/videos/${aulaId}.mp4`, videoError: null },
      });
    }
  } catch (err) {
    if (isCurrent()) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar o vídeo.";
      await prisma.aula.update({
        where: { id: aulaId },
        data: { videoStatus: "FAILED", videoError: message.slice(0, 2000) },
      });
    }
  } finally {
    if (isCurrent()) {
      activeGenerations.delete(aulaId);
    }
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
