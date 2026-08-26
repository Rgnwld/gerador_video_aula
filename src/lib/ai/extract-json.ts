/**
 * Extrai o primeiro objeto JSON de uma resposta em texto livre: tenta um
 * bloco de código ```json primeiro, depois cai para o trecho entre a
 * primeira "{" e a última "}".
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // cai para o fallback abaixo
    }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Não foi possível encontrar um JSON na resposta da IA.");
  }

  return JSON.parse(text.slice(start, end + 1));
}
