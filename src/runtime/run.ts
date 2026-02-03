import { ModelProvider } from "../model/provider.js";
import { createTraceId } from "../protocol/ids.js";
import { RunTrace, ToolCall, ToolResult } from "../protocol/types.js";
import { retrieveMemory, RetrievalBudget } from "../memory/retrieval.js";
import { defaultPolicyForToolCall, denyToolCall } from "./policy.js";
import { ToolRegistry } from "../tools/registry.js";
import type { Logger } from "../logging/logger.js";
import { appendSessionLog } from "../memory/sessions.js";
import type { ApprovalProvider } from "../tools/approvals.js";
import { CliApprovalProvider } from "../tools/approvals.js";
import { executeToolCall, ToolContext } from "../tools/executor.js";
import { BUILTIN_HANDLERS } from "../tools/builtins.js";
import type { Config } from "../config/schema.js";
import { appendAudit } from "../audit/log.js";
import { isModelAllowed } from "../policy/engine.js";

export interface RunOptions {
  modelProvider: ModelProvider;
  toolRegistry: ToolRegistry;
  logger: Logger;
  tokenBudgets?: RetrievalBudget;
  scope?: "org" | "team" | "project" | "user";
  approvalProvider?: ApprovalProvider;
  config?: Config | null;
}

export interface RunOutcome {
  response: string;
  trace: RunTrace;
  toolResults: ToolResult[];
}

function buildPrompt(task: string, memory: string[]): string {
  const memorySection = memory.length > 0 ? memory.join("\n") : "(none)";
  return `You are cellar-door.\n\nMemory (retrieved, budgeted):\n${memorySection}\n\nTask:\n${task}\n\nRespond with JSON: {"response": "...", "toolCalls": []}.`;
}

function resolveBudgets(contextWindow: number, override?: RetrievalBudget): RetrievalBudget {
  if (override) {
    return override;
  }
  const total = Math.min(4096, Math.floor(contextWindow * 0.25));
  const bootstrapMax = Math.floor(total * 0.25);
  const hotMax = Math.floor(total * 0.25);
  const warmMax = Math.max(0, total - bootstrapMax - hotMax);
  return { bootstrapMax, hotMax, warmMax };
}

function extractResponse(content: string): { response: string; toolCalls: ToolCall[] } {
  try {
    const parsed = JSON.parse(content) as { response?: string; toolCalls?: ToolCall[] };
    return {
      response: typeof parsed.response === "string" ? parsed.response : content,
      toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
    };
  } catch {
    return { response: content, toolCalls: [] };
  }
}

export async function runTask(task: string, options: RunOptions): Promise<RunOutcome> {
  const traceId = createTraceId();
  const startedAt = new Date().toISOString();
  const trace: RunTrace = {
    traceId,
    startedAt,
    toolCalls: [],
    toolResults: [],
  };

  const budgets = resolveBudgets(options.modelProvider.capabilities().contextWindow, options.tokenBudgets);
  const memory = await retrieveMemory({
    task,
    scope: options.scope ?? "project",
    budget: budgets,
    estimateTokens: options.modelProvider.estimateTokens.bind(options.modelProvider),
  });
  const prompt = buildPrompt(task, memory.items);

  const modelPolicy = isModelAllowed(options.modelProvider.kind, options.config ?? null);
  if (!modelPolicy.allowed) {
    await appendAudit({
      ts: new Date().toISOString(),
      type: "policy",
      actor: "runtime",
      message: modelPolicy.reason,
      data: { provider: options.modelProvider.kind },
    });
    throw new Error(modelPolicy.reason);
  }

  const modelResponse = await options.modelProvider.generate({
    messages: [
      { role: "system", content: "You are a safe, model-agnostic automation gateway." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  trace.model = {
    provider: options.modelProvider.kind,
    model: options.modelProvider.model,
    durationMs: modelResponse.durationMs,
  };
  await appendAudit({
    ts: new Date().toISOString(),
    type: "model",
    actor: "runtime",
    message: "Model invocation",
    data: { provider: options.modelProvider.kind, model: options.modelProvider.model, traceId },
  });

  const parsed = extractResponse(modelResponse.content);
  trace.toolCalls = parsed.toolCalls;

  const toolResults: ToolResult[] = [];
  const approvalProvider = options.approvalProvider ?? new CliApprovalProvider();
  const context: ToolContext = {
    config: options.config ?? null,
    registry: options.toolRegistry,
    approve: approvalProvider,
    handlers: BUILTIN_HANDLERS,
  };

  for (const call of parsed.toolCalls) {
    const decision = defaultPolicyForToolCall(call);
    if (!decision.allowed) {
      toolResults.push(denyToolCall(call, decision.reason));
      continue;
    }
    const result = await executeToolCall(call, context);
    toolResults.push(result);
    await appendAudit({
      ts: new Date().toISOString(),
      type: "tool",
      actor: "runtime",
      message: `Tool ${call.name} ${result.status}`,
      data: { id: call.id, name: call.name, status: result.status },
    });
  }

  trace.toolResults = toolResults;

  options.logger.info("Run completed.", { traceId, toolCalls: toolResults.length });
  await appendSessionLog(
    `# ${new Date().toISOString()}\n\nTask:\n${task}\n\nResponse:\n${parsed.response}\n\nTrace:\n${traceId}\n\n---\n`
  );

  return {
    response: parsed.response,
    trace,
    toolResults,
  };
}
