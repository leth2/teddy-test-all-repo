import express, { Request, Response } from "express";
import { createAnthropicClient, injectSystemPrompt } from "./anthropicClient.js";

const PORT = parseInt(process.env.PORT ?? "8787", 10);
const CLAUDE_CODE_TOKEN = process.env.CLAUDE_CODE_TOKEN ?? "";

if (!CLAUDE_CODE_TOKEN) {
  console.error("❌ CLAUDE_CODE_TOKEN 환경변수가 없습니다.");
  process.exit(1);
}

const client = createAnthropicClient(CLAUDE_CODE_TOKEN);
const app = express();
app.use(express.json({ limit: "10mb" }));

// GET /health
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "cc-proxy" });
});

// GET /v1/models — 더미 응답 (cline 호환)
app.get("/v1/models", (_req: Request, res: Response) => {
  // OAuth로 접근 가능한 모델만 노출 (haiku는 OAuth 범위 밖)
  res.json({
    object: "list",
    data: [
      { id: "claude-sonnet-4-5", object: "model", created: 0, owned_by: "anthropic" },
      { id: "claude-opus-4-5", object: "model", created: 0, owned_by: "anthropic" },
    ],
  });
});

// POST /v1/messages — 메인 프록시
app.post("/v1/messages", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const isStream = body.stream === true;

    // system prompt 처리
    const system = injectSystemPrompt(body.system);

    const params = {
      ...body,
      system,
    } as Parameters<typeof client.messages.create>[0];

    if (isStream) {
      // SSE 스트리밍
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = client.messages.stream(params);

      stream.on("text", () => {
        // event stream은 SDK가 처리
      });

      for await (const event of stream) {
        const data = JSON.stringify(event);
        res.write(`event: ${(event as { type: string }).type}\ndata: ${data}\n\n`);
      }

      res.write("event: message_stop\ndata: {}\n\n");
      res.end();
    } else {
      // 단일 응답
      const message = await client.messages.create({ ...params, stream: false });
      res.json(message);
    }
  } catch (err: unknown) {
    console.error("[cc-proxy] 오류:", err);

    // Anthropic SDK 에러 → 상태 코드 그대로 전달
    if (
      err !== null &&
      typeof err === "object" &&
      "status" in err &&
      "error" in err
    ) {
      const apiErr = err as { status: number; error: unknown };
      res.status(apiErr.status).json(apiErr.error);
      return;
    }

    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  const HOST_IP = process.env.HOST_IP ?? "<this-machine-ip>";
  console.log(`✅ cc-proxy listening on http://0.0.0.0:${PORT}`);
  console.log(`   클라이언트 설정: ANTHROPIC_BASE_URL=http://${HOST_IP}:${PORT}`);
});
