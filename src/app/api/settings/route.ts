import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAiSettings, updateAiSettings } from "@/lib/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const settings = await getAiSettings();
  return NextResponse.json(settings);
}

const VALID_PROVIDERS = ["acp", "anthropic", "ollama"];

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await request.json();
  const data: Record<string, string | null> = {};

  if (typeof body.aiProvider === "string") {
    if (!VALID_PROVIDERS.includes(body.aiProvider)) {
      return NextResponse.json({ error: "Provedor inválido." }, { status: 400 });
    }
    data.aiProvider = body.aiProvider;
  }
  if ("anthropicApiKey" in body) data.anthropicApiKey = body.anthropicApiKey || null;
  if ("anthropicModel" in body) data.anthropicModel = body.anthropicModel || null;
  if ("ollamaBaseUrl" in body) data.ollamaBaseUrl = body.ollamaBaseUrl || null;
  if ("ollamaModel" in body) data.ollamaModel = body.ollamaModel || null;

  await updateAiSettings(data);
  const settings = await getAiSettings();
  return NextResponse.json(settings);
}
