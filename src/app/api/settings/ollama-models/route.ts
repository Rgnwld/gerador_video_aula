import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const baseUrl = searchParams.get("baseUrl") || "http://localhost:11434";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
  } catch {
    return NextResponse.json(
      { error: `Não foi possível conectar ao Ollama em ${baseUrl}. Verifique se ele está rodando.` },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json({ error: `Ollama respondeu com erro ${response.status}.` }, { status: 502 });
  }

  const data = await response.json();
  const models: string[] = (data?.models ?? []).map((m: { name: string }) => m.name);
  return NextResponse.json({ models });
}
