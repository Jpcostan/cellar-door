import { ModelProvider } from "../model/provider.js";
import { createTraceId } from "../protocol/ids.js";
import { RunTrace, ToolCall, ToolResult } from "../protocol/types.js";
import { retrieveMemory } from "../memory/retrieval.js";
import { defaultPolicyForToolCall, denyToolCall } from "./policy.js";
import { ToolRegistry } from "../tools/registry.js";
import type { Logger } from "../logging/logger.js";

export interface RunOptions {
  modelProvider: ModelProvider;
  toolRegistry: ToolRegistry;
  logger: Logger;
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

  const memory = await retrieveMemory(task, 0);
  const prompt = buildPrompt(task, memory.items);

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

  const parsed = extractResponse(modelResponse.content);
  trace.toolCalls = parsed.toolCalls;

  const toolResults: ToolResult[] = [];
  for (const call of parsed.toolCalls) {
    const decision = defaultPolicyForToolCall(call);
    if (!decision.allowed) {
      toolResults.push(denyToolCall(call, decision.reason));
      continue;
    }

    const tool = options.toolRegistry.get(call.name);
    if (!tool) {
      toolResults.push(denyToolCall(call, "Unknown tool."));
      continue;
    }

    if (!options.toolRegistry.validateInput(call.name, call.arguments)) {
      toolResults.push(denyToolCall(call, "Tool input validation failed."));
      continue;
    }

    toolResults.push({
      id: call.id,
      name: call.name,
      status: "error",
      error: "Tool execution not implemented.",
    });
  }

  trace.toolResults = toolResults;

  options.logger.info("Run completed.", { traceId, toolCalls: toolResults.length });

  return {
    response: parsed.response,
    trace,
    toolResults,
  };
}
