import { ModelCapabilities, ModelProvider, ModelRequest, ModelResponse } from "./provider.js";
import { ToolCall } from "../protocol/types.js";

export interface OllamaConfig {
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class OllamaModelProvider implements ModelProvider {
  readonly kind = "ollama";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl ?? "http://localhost:11434";
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  capabilities(): ModelCapabilities {
    return {
      contextWindow: 8192,
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
      const url = new URL("/api/chat", this.baseUrl);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Model HTTP error: ${response.status}`);
      }

      const payload = (await response.json()) as { message?: { content?: string } };
      const content = payload?.message?.content ?? "";
      const toolCalls: ToolCall[] = [];

      return {
        content,
        toolCalls,
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
