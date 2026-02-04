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
import { appendAudit, resolveActor } from "../audit/log.js";
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

function formatToolCatalog(registry: ToolRegistry): string {
  const tools = registry.list();
  if (tools.length === 0) {
    return "(no tools available)";
  }
  return tools
    .map((tool) => {
      const input = JSON.stringify(tool.inputSchema);
      return `- ${tool.name}: ${tool.description}\n  inputSchema: ${input}`;
    })
    .join("\n");
}

function buildPrompt(params: {
  task: string;
  memory: string[];
  toolCatalog: string;
  workspaceRoot: string;
  toolResults?: ToolResult[];
}): string {
  const memorySection = memory.length > 0 ? memory.join("\n") : "(none)";
  const toolResults = params.toolResults ?? [];
  const toolResultsSection = toolResults.length > 0 ? JSON.stringify(toolResults, null, 2) : "(none)";
  return `You are cellar-door.

Workspace root: ${params.workspaceRoot}

Memory (retrieved, budgeted):
${memorySection}

Available tools:
${params.toolCatalog}

Tool results (if any):
${toolResultsSection}

Task:
${params.task}

Instructions:
- If you need filesystem or git context, use tools like exec.run, git.status, git.log, or fs.read.
- Tool calls must be JSON objects in toolCalls with shape: {"id":"call-1","name":"tool.name","arguments":{...}}.
- If you use tools, set "response" to an empty string and include toolCalls.
- If you have enough info, return a concise "response" and set toolCalls to [].

Respond with JSON: {"response": "...", "toolCalls": []}.`;
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
  const toolCatalog = formatToolCatalog(options.toolRegistry);
  const workspaceRoot = options.config?.workspaceRoot ?? process.cwd();

  const modelPolicy = isModelAllowed(options.modelProvider.kind, options.config ?? null);
  if (!modelPolicy.allowed) {
    await appendAudit({
      ts: new Date().toISOString(),
      type: "policy",
      actor: resolveActor(options.config ?? null, "runtime"),
      message: modelPolicy.reason,
      data: { provider: options.modelProvider.kind },
    });
    throw new Error(modelPolicy.reason);
  }

  const toolResults: ToolResult[] = [];
  const toolCalls: ToolCall[] = [];
  const approvalProvider = options.approvalProvider ?? new CliApprovalProvider();
  const context: ToolContext = {
    config: options.config ?? null,
    registry: options.toolRegistry,
    approve: approvalProvider,
    handlers: BUILTIN_HANDLERS,
  };

  const maxSteps = 2;
  let lastModelDurationMs = 0;

  const invokeModel = async (prompt: string): Promise<{ response: string; toolCalls: ToolCall[] }> => {
    const modelResponse = await options.modelProvider.generate({
      messages: [
        { role: "system", content: "You are a safe, model-agnostic automation gateway." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });
    lastModelDurationMs = modelResponse.durationMs;
    await appendAudit({
      ts: new Date().toISOString(),
      type: "model",
      actor: resolveActor(options.config ?? null, "runtime"),
      message: "Model invocation",
      data: { provider: options.modelProvider.kind, model: options.modelProvider.model, traceId },
    });
    return extractResponse(modelResponse.content);
  };

  let parsed = await invokeModel(buildPrompt({ task, memory: memory.items, toolCatalog, workspaceRoot }));

  for (let step = 0; step < maxSteps; step += 1) {
    if (parsed.toolCalls.length === 0) {
      break;
    }

    for (const call of parsed.toolCalls) {
      toolCalls.push(call);
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
        actor: resolveActor(options.config ?? null, "runtime"),
        message: `Tool ${call.name} ${result.status}`,
        data: { id: call.id, name: call.name, status: result.status },
      });
    }

    parsed = await invokeModel(
      buildPrompt({ task, memory: memory.items, toolCatalog, workspaceRoot, toolResults })
    );
  }

  trace.model = {
    provider: options.modelProvider.kind,
    model: options.modelProvider.model,
    durationMs: lastModelDurationMs,
  };
  trace.toolCalls = toolCalls;
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
