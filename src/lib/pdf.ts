// pdf-parse não tem tipos ESM/CJS totalmente compatíveis com bundling do Next,
// então importamos a implementação interna diretamente para evitar o código de
// debug do pacote (que tenta ler um PDF de exemplo quando importado como módulo principal).
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text.trim();
}
