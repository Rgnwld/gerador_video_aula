import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { runAcpPrompt } from "./client";

const WORK_ROOT = path.join(process.cwd(), ".acp-video-work");
const PUBLIC_VIDEOS_DIR = path.join(process.cwd(), "public", "videos");

function buildVideoPrompt(params: { hasMaterial: boolean }): string {
  return `Você é um produtor de vídeo instrucional. Neste diretório de trabalho existe um arquivo "roteiro.md" com o título e o roteiro de uma aula de treinamento profissional${params.hasMaterial ? ', e um arquivo "material.pdf" com o material fonte completo (use como referência extra para exemplos/detalhes, se ajudar)' : ""}.

Leia "roteiro.md" primeiro. Depois, use a skill/CLI do HyperFrames (carregue a skill "hyperframes" e siga as instruções dela) para criar um vídeo curto (60 a 90 segundos) baseado nesse roteiro: texto/legendas na tela apresentando os pontos principais de forma clara, sem precisar de animações elaboradas — é conteúdo de treinamento interno, priorize terminar rápido e funcional em vez de sofisticado.

Renderize o resultado final e salve como "output.mp4" diretamente neste diretório de trabalho (não em subpastas). Ao terminar, responda apenas com a palavra DONE se o arquivo output.mp4 foi criado com sucesso, ou com uma mensagem curta explicando o que deu errado se não conseguiu gerar o vídeo.`;
}

export async function generateAulaVideo(aulaId: string): Promise<void> {
  const aula = await prisma.aula.findUnique({
    where: { id: aulaId },
    include: { trilha: true },
  });
  if (!aula) return;

  const workDir = path.join(WORK_ROOT, aulaId);

  try {
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(workDir, { recursive: true });

    await fs.writeFile(
      path.join(workDir, "roteiro.md"),
      `# ${aula.title}\n\n${aula.videoScript}\n`,
      "utf8"
    );

    let hasMaterial = false;
    if (aula.trilha.sourceFilePath) {
      try {
        await fs.copyFile(
          path.join(process.cwd(), aula.trilha.sourceFilePath),
          path.join(workDir, "material.pdf")
        );
        hasMaterial = true;
      } catch {
        // segue sem o material extra se não conseguir copiar
      }
    }

    await runAcpPrompt({
      cwd: workDir,
      prompt: buildVideoPrompt({ hasMaterial }),
      timeoutMs: 30 * 60_000,
    });

    const outputPath = path.join(workDir, "output.mp4");
    await fs.access(outputPath);

    await fs.mkdir(PUBLIC_VIDEOS_DIR, { recursive: true });
    const finalPath = path.join(PUBLIC_VIDEOS_DIR, `${aulaId}.mp4`);
    await fs.copyFile(outputPath, finalPath);

    await prisma.aula.update({
      where: { id: aulaId },
      data: { videoStatus: "READY", videoUrl: `/videos/${aulaId}.mp4`, videoError: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar o vídeo.";
    await prisma.aula.update({
      where: { id: aulaId },
      data: { videoStatus: "FAILED", videoError: message.slice(0, 2000) },
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
