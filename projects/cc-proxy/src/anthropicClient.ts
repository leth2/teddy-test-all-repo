import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_CODE_VERSION = "2.1.62";
const CLAUDE_CODE_SYSTEM_PROMPT =
  "You are Claude Code, Anthropic's official CLI for Claude.";

const OAUTH_BETA_HEADERS =
  "claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14";

export function createAnthropicClient(token: string): Anthropic {
  return new Anthropic({
    apiKey: null as unknown as string, // OAuth 방식: apiKey 불필요
    authToken: token,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      "anthropic-beta": OAUTH_BETA_HEADERS,
      "user-agent": `claude-cli/${CLAUDE_CODE_VERSION}`,
      "x-app": "cli",
    },
  });
}

/**
 * system prompt 처리:
 * 1. system 없음 → Claude Code prompt 단독 주입
 * 2. system 있고 이미 포함 → 그대로
 * 3. system 있고 미포함 → 앞에 prepend
 */
export function injectSystemPrompt(
  system: unknown
): Anthropic.MessageParam["content"] | undefined {
  const ccBlock: Anthropic.TextBlockParam = {
    type: "text",
    text: CLAUDE_CODE_SYSTEM_PROMPT,
  };

  if (!system) {
    return [ccBlock] as unknown as Anthropic.MessageParam["content"];
  }

  // string 형태
  if (typeof system === "string") {
    if (system.includes(CLAUDE_CODE_SYSTEM_PROMPT)) {
      return system as unknown as Anthropic.MessageParam["content"];
    }
    return [
      ccBlock,
      { type: "text", text: system },
    ] as unknown as Anthropic.MessageParam["content"];
  }

  // array 형태
  if (Array.isArray(system)) {
    const alreadyInjected = system.some(
      (b: unknown) =>
        typeof b === "object" &&
        b !== null &&
        "text" in b &&
        typeof (b as { text: unknown }).text === "string" &&
        ((b as { text: string }).text).includes(CLAUDE_CODE_SYSTEM_PROMPT)
    );
    if (alreadyInjected) return system as unknown as Anthropic.MessageParam["content"];
    return [ccBlock, ...system] as unknown as Anthropic.MessageParam["content"];
  }

  return [ccBlock] as unknown as Anthropic.MessageParam["content"];
}
