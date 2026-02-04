import { ModelCapabilities, ModelProvider, ModelRequest, ModelResponse } from "./provider.js";
import { ToolCall } from "../protocol/types.js";

export interface HttpProviderConfig {
  baseUrl: string;
  model: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function parseToolCalls(content: string): ToolCall[] {
  try {
    const parsed = JSON.parse(content) as { toolCalls?: ToolCall[] };
    if (parsed && Array.isArray(parsed.toolCalls)) {
      return parsed.toolCalls;
    }
  } catch {
    return [];
  }
  return [];
}

function extractContent(payload: unknown): string {
  const data = payload as {
    choices?: Array<{ message?: { content?: string } }>; 
  };
  const content = data.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

export class HttpModelProvider implements ModelProvider {
  readonly kind = "http";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(config: HttpProviderConfig) {
    this.baseUrl = ensureTrailingSlash(config.baseUrl);
    this.model = config.model;
    this.headers = { "Content-Type": "application/json", ...(config.headers ?? {}) };
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  capabilities(): ModelCapabilities {
    return {
      contextWindow: 16_384,
      supportsTools: false,
      supportsStreaming: false,
    };
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL("chat/completions", this.baseUrl);
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const raw = await response.text();
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { error?: { message?: string; type?: string; code?: string } };
              if (parsed?.error?.message) {
                const parts = [parsed.error.message];
                if (parsed.error.type) parts.push(`type=${parsed.error.type}`);
                if (parsed.error.code) parts.push(`code=${parsed.error.code}`);
                detail = parts.join(" ");
              } else {
                detail = raw;
              }
            } catch {
              detail = raw;
            }
          }
        } catch {
          detail = "";
        }
        const suffix = detail ? `: ${detail}` : "";
        throw new Error(`Model HTTP error: ${response.status}${suffix}`);
      }

      const payload = (await response.json()) as unknown;
      const content = extractContent(payload);
      return {
        content,
        toolCalls: parseToolCalls(content),
        raw: payload,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Model request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
