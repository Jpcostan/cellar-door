import type { Config } from "../config/schema.js";
import type { ToolCall, ToolDefinition, ToolResult } from "../protocol/types.js";
import type { ToolRegistry } from "./registry.js";
import type { ApprovalProvider } from "./approvals.js";
import { evaluateToolPolicy } from "./policy.js";

export interface ToolContext {
  config: Config | null;
  registry: ToolRegistry;
  approve: ApprovalProvider;
  handlers: Map<string, ToolHandler>;
}

export interface ToolHandler {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>, config: Config | null): Promise<Record<string, unknown>>;
}

export async function executeToolCall(call: ToolCall, context: ToolContext): Promise<ToolResult> {
  const tool = context.registry.get(call.name);
  if (!tool) {
    return { id: call.id, name: call.name, status: "error", error: "Unknown tool." };
  }

  if (!context.registry.validateInput(call.name, call.arguments)) {
    return { id: call.id, name: call.name, status: "error", error: "Tool input validation failed." };
  }

  const policy = evaluateToolPolicy(tool, context.config);
  if (!policy.allowed) {
    return { id: call.id, name: call.name, status: "denied", error: policy.reason };
  }

  if (policy.requiresApproval) {
    const approved = await context.approve.requestApproval({ tool, call, reason: policy.reason });
    if (!approved) {
      return { id: call.id, name: call.name, status: "denied", error: "Approval denied." };
    }
  }

  const handler = context.handlers.get(call.name);
  if (!handler) {
    return { id: call.id, name: call.name, status: "error", error: "Tool handler missing." };
  }

  try {
    const output = await handler.execute(call.arguments, context.config);
    if (!context.registry.validateOutput(call.name, output)) {
      return { id: call.id, name: call.name, status: "error", error: "Tool output validation failed." };
    }
    return { id: call.id, name: call.name, status: "success", output };
  } catch (error) {
    return {
      id: call.id,
      name: call.name,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
