import { buildSystemPrompt, buildUserPrompt, type BriefKind } from "./prompts";

export interface BriefConfig {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
}

export async function streamBrief(
  kind: BriefKind,
  evidenceBlock: string,
  config: BriefConfig,
  onChunk: (text: string) => void | Promise<void>
): Promise<string> {
  const url = `${config.apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: config.model,
    stream: true,
    temperature: 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(kind) },
      { role: "user", content: buildUserPrompt(kind, evidenceBlock) },
    ],
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
  if (config.apiBaseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://github.com/Tokenlaxx/cursor-calgary-2026-june-micro-hackathon";
    headers["X-Title"] = "OffDash";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText.slice(0, 400)}`);
  }

  if (!response.body) {
    throw new Error("Streaming body missing from API response");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = json.choices?.[0]?.delta?.content ?? "";
        if (chunk) {
          full += chunk;
          await onChunk(chunk);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  return full;
}
