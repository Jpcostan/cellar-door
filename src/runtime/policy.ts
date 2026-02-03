import { ToolCall, ToolResult } from "../protocol/types.js";

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

export function defaultPolicyForToolCall(call: ToolCall): PolicyDecision {
  void call;
  return {
    allowed: true,
    reason: "Tool call requires policy evaluation.",
  };
}

export function denyToolCall(call: ToolCall, reason: string): ToolResult {
  return {
    id: call.id,
    name: call.name,
    status: "denied",
    error: reason,
  };
}
