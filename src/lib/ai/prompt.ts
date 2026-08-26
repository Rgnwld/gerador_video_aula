// Limite defensivo de tamanho do texto extraído do PDF, para controlar custo/latência
// da chamada à IA — suficiente para PDFs de treinamento profissional típicos.
export const MAX_SOURCE_TEXT_CHARS = 120_000;

export function buildTrilhaPrompt(params: {
  trilhaTitle: string;
  sourceText: string;
  questionsPerAula: number;
}): string {
  const { trilhaTitle, sourceText, questionsPerAula } = params;
  const truncatedText = sourceText.slice(0, MAX_SOURCE_TEXT_CHARS);

  return `Você é um designer instrucional especialista em criar trilhas de aprendizagem profissionais.

Trilha: "${trilhaTitle}"

A seguir está o conteúdo extraído de um PDF fornecido por um administrador sobre um tema profissional. Divida esse conteúdo em uma sequência de aulas detalhadas e profissionais, ORDENADAS da mais fácil (dificuldade 1) para a mais difícil (dificuldade 5), cobrindo progressivamente todo o material. Use entre 3 e 8 aulas, conforme a complexidade e extensão do conteúdo.

Para cada aula, gere:
1. Um título claro.
2. Um resumo escrito detalhado (vários parágrafos) do conteúdo daquela aula especificamente.
3. Um roteiro de vídeo bem definido, pensado para capturar e manter a atenção do aluno: comece com um gancho (pergunta, fato curioso ou problema real), desenvolva o conteúdo de forma didática com exemplos práticos, e feche com um resumo e uma chamada para ação/reflexão.
4. Exatamente ${questionsPerAula} pergunta(s) de múltipla escolha (4 alternativas cada) para verificar o aprendizado do aluno sobre aquela aula, com o índice da alternativa correta.

Responda SOMENTE com o JSON estruturado do resultado, sem nenhum texto fora dele.

Conteúdo do PDF:
"""
${truncatedText}
"""`;
}

const SHARED_INSTRUCTIONS = (questionsPerAula: number) => `Divida esse conteúdo em uma sequência de aulas detalhadas e profissionais, ORDENADAS da mais fácil (dificuldade 1) para a mais difícil (dificuldade 5), cobrindo progressivamente todo o material. Use entre 3 e 8 aulas, conforme a complexidade e extensão do conteúdo.

Para cada aula, gere:
1. Um título claro.
2. Um resumo escrito detalhado (vários parágrafos) do conteúdo daquela aula especificamente.
3. Um roteiro de vídeo bem definido, pensado para capturar e manter a atenção do aluno: comece com um gancho (pergunta, fato curioso ou problema real), desenvolva o conteúdo de forma didática com exemplos práticos, e feche com um resumo e uma chamada para ação/reflexão.
4. Exatamente ${questionsPerAula} pergunta(s) de múltipla escolha (4 alternativas cada) para verificar o aprendizado do aluno sobre aquela aula, com o índice da alternativa correta.`;

const JSON_SHAPE_INSTRUCTIONS = `Responda com um objeto JSON dentro de um bloco de código \`\`\`json com este formato (e nada além dele — sem explicações antes ou depois):
{
  "aulas": [
    {
      "title": string,
      "difficulty": number (1 a 5),
      "summary": string,
      "videoScript": string,
      "questions": [
        { "text": string, "options": [string, string, string, string], "correctOptionIndex": number (0 a 3) }
      ]
    }
  ]
}`;

/**
 * Variante usada pelo provider ACP: em vez de embutir o texto do PDF no
 * prompt, instrui o agente a ler o arquivo PDF original diretamente
 * (leitura nativa de documento) no seu diretório de trabalho.
 */
export function buildTrilhaPromptForFile(params: {
  trilhaTitle: string;
  pdfFileName: string;
  questionsPerAula: number;
}): string {
  const { trilhaTitle, pdfFileName, questionsPerAula } = params;

  return `Você é um designer instrucional especialista em criar trilhas de aprendizagem profissionais.

Trilha: "${trilhaTitle}"

Existe um arquivo PDF chamado "${pdfFileName}" no seu diretório de trabalho atual, fornecido por um administrador sobre um tema profissional. Leia esse arquivo diretamente (é o material fonte) antes de continuar. Não use nenhuma outra ferramenta além de ler esse arquivo — não edite nada, não rode comandos.

${SHARED_INSTRUCTIONS(questionsPerAula)}

${JSON_SHAPE_INSTRUCTIONS}`;
}
