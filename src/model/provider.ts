import { ToolCall } from "../protocol/types.js";

export type ModelRole = "system" | "user" | "assistant";

export interface ModelMessage {
  role: ModelRole;
  content: string;
}

export interface ModelCapabilities {
  contextWindow: number;
  supportsTools: boolean;
  supportsStreaming: boolean;
}

export interface ModelRequest {
  messages: ModelMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ModelResponse {
  content: string;
  toolCalls: ToolCall[];
  raw: unknown;
  durationMs: number;
}

export interface ModelProvider {
  readonly kind: string;
  readonly model: string;
  capabilities(): ModelCapabilities;
  estimateTokens(text: string): number;
  generate(request: ModelRequest): Promise<ModelResponse>;
}
