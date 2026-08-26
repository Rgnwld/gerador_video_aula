import fs from "node:fs/promises";
import path from "node:path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "trilhas");

/** Salva o PDF original de uma trilha em disco e retorna o caminho relativo ao projeto. */
export async function saveTrilhaPdf(trilhaId: string, buffer: Buffer): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const relativePath = path.join("uploads", "trilhas", `${trilhaId}.pdf`);
  await fs.writeFile(path.join(process.cwd(), relativePath), buffer);
  return relativePath;
}
