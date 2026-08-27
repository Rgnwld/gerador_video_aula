import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Writable, Readable } from "node:stream";
import path from "node:path";
import * as acp from "@agentclientprotocol/sdk";

const CLAUDE_AGENT_ACP_BIN = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "claude-agent-acp.cmd" : "claude-agent-acp"
);

export type AcpUpdate =
  | { kind: "text"; text: string }
  | { kind: "tool"; title: string; status: string };

/**
 * Roda um prompt único numa sessão ACP (Claude Code via
 * @agentclientprotocol/claude-agent-acp) num diretório de trabalho isolado,
 * aprovando automaticamente qualquer pedido de permissão (Bash, leitura/
 * escrita de arquivos) — necessário porque isso roda sem um humano por trás
 * para responder aos prompts de permissão.
 */
export async function runAcpPrompt(params: {
  cwd: string;
  prompt: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  onUpdate?: (update: AcpUpdate) => void;
}): Promise<{ text: string; stopReason: string }> {
  const { cwd, prompt, timeoutMs = 5 * 60_000, signal, onUpdate } = params;

  const agentProcess: ChildProcessWithoutNullStreams = spawn(process.execPath, [CLAUDE_AGENT_ACP_BIN], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Sem isso, escrever no stdin depois que o processo filho já morreu
  // (ex: no cleanup) derruba o processo Node inteiro do servidor com um
  // EPIPE não tratado.
  agentProcess.stdin.on("error", () => {});
  let stderrTail = "";
  agentProcess.stderr.on("data", (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString("utf8")).slice(-4000);
  });

  let settled = false;
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    agentProcess.kill();
  }, timeoutMs);

  let cancelled = false;
  const onAbort = () => {
    cancelled = true;
    agentProcess.kill();
  };
  signal?.addEventListener("abort", onAbort);

  const input = Writable.toWeb(agentProcess.stdin) as WritableStream<Uint8Array>;
  const output = Readable.toWeb(agentProcess.stdout) as ReadableStream<Uint8Array>;
  const stream = acp.ndJsonStream(input, output);

  let fullText = "";

  function pickPermissionOption(options: { optionId: string; kind: string }[]) {
    return (
      options.find((o) => o.kind === "allow_always") ||
      options.find((o) => o.kind === "allow_once") ||
      options[0]
    );
  }

  try {
    const result = await acp
      .client({ name: "plataforma-cursos" })
      .onRequest(acp.methods.client.session.requestPermission, async (ctx) => {
        const opt = pickPermissionOption(ctx.params.options);
        return { outcome: { outcome: "selected", optionId: opt.optionId } };
      })
      .onRequest(acp.methods.client.fs.writeTextFile, async () => ({}))
      .onRequest(acp.methods.client.fs.readTextFile, async () => ({ content: "" }))
      .connectWith(stream, async (ctx) => {
        await ctx.request(acp.methods.agent.initialize, {
          protocolVersion: acp.PROTOCOL_VERSION,
          clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } },
        });

        return ctx.buildSession(cwd).withSession(async (session) => {
          session.prompt(prompt);

          for (;;) {
            const message = await session.nextUpdate();
            if (message.kind === "stop") return message.response;

            const update = message.notification.update;
            if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
              fullText += update.content.text;
              onUpdate?.({ kind: "text", text: update.content.text });
            } else if (update.sessionUpdate === "tool_call" || update.sessionUpdate === "tool_call_update") {
              onUpdate?.({ kind: "tool", title: update.title ?? update.toolCallId, status: update.status ?? "" });
            }
          }
        });
      });

    return { text: fullText, stopReason: result.stopReason };
  } catch (err) {
    if (cancelled) {
      throw new Error("Cancelado.");
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(stderrTail ? `${message}\n--- stderr ---\n${stderrTail}` : message);
  } finally {
    settled = true;
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
    agentProcess.stdin.end();
    setTimeout(() => agentProcess.kill(), 200);
  }
}
