export type SideEffectClass =
  | "read_only"
  | "writes_files"
  | "network"
  | "exec"
  | "money"
  | "admin";

export interface ToolDefinition {
  name: string;
  description: string;
  sideEffectClass: SideEffectClass;
  requiredScopes: string[];
  inputSchema: object;
  outputSchema: object;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timeoutMs?: number;
  idempotencyKey?: string;
}

export type ToolResultStatus = "success" | "error" | "denied";

export interface ToolResult {
  id: string;
  name: string;
  status: ToolResultStatus;
  output?: Record<string, unknown>;
  error?: string;
}

export interface RunTrace {
  traceId: string;
  startedAt: string;
  model?: {
    provider: string;
    model: string;
    durationMs: number;
  };
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}
