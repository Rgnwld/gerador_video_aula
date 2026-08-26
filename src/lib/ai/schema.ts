import { z } from "zod";

// Schema JSON compartilhado: usado como `input_schema` da tool no provider Anthropic
// e como `format` (structured output) no provider Ollama — ambos aceitam JSON Schema.
export const EMIT_TRILHA_JSON_SCHEMA = {
  type: "object",
  properties: {
    aulas: {
      type: "array",
      description:
        "Aulas ordenadas da mais fácil para a mais difícil, cobrindo todo o conteúdo relevante do material fonte.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título curto e claro da aula." },
          difficulty: {
            type: "integer",
            minimum: 1,
            maximum: 5,
            description: "Dificuldade da aula, de 1 (iniciante) a 5 (avançado), crescente ao longo da trilha.",
          },
          summary: {
            type: "string",
            description: "Resumo escrito, detalhado e profissional do conteúdo da aula (vários parágrafos).",
          },
          videoScript: {
            type: "string",
            description:
              "Roteiro de vídeo bem definido para gravação/narração: precisa ter um gancho inicial que capte a atenção, desenvolvimento didático com exemplos práticos, e um fechamento com resumo/chamada para ação.",
          },
          questions: {
            type: "array",
            description: "Perguntas de múltipla escolha sobre o conteúdo da aula.",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 4,
                  maxItems: 4,
                  description: "Exatamente 4 alternativas.",
                },
                correctOptionIndex: {
                  type: "integer",
                  minimum: 0,
                  maximum: 3,
                  description: "Índice (0-based) da alternativa correta em 'options'.",
                },
              },
              required: ["text", "options", "correctOptionIndex"],
            },
          },
        },
        required: ["title", "difficulty", "summary", "videoScript", "questions"],
      },
    },
  },
  required: ["aulas"],
} as const;

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctOptionIndex: z.number().int().min(0),
});

const aulaSchema = z.object({
  title: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  summary: z.string().min(1),
  videoScript: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export const trilhaGenerationSchema = z.object({
  aulas: z.array(aulaSchema).min(1),
});

export type GeneratedAula = z.infer<typeof aulaSchema>;
