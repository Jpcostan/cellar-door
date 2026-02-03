import type { SideEffectClass, ToolDefinition } from "../protocol/types.js";
import type { Config } from "../config/schema.js";

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
}

const RISKY: SideEffectClass[] = ["writes_files", "network", "exec", "ui_control", "screen_capture", "money", "admin"];

export function evaluateToolPolicy(tool: ToolDefinition, config: Config | null): PolicyDecision {
  const isRisky = RISKY.includes(tool.sideEffectClass);
  if (!isRisky) {
    return { allowed: true, reason: "Read-only tool.", requiresApproval: false };
  }

  if (tool.sideEffectClass === "exec" && !config?.tools?.execEnabled) {
    return { allowed: false, reason: "exec is disabled by default.", requiresApproval: false };
  }

  if (tool.sideEffectClass === "ui_control" && !config?.tools?.browserEnabled) {
    return { allowed: false, reason: "browser automation is disabled by default.", requiresApproval: false };
  }

  if (tool.sideEffectClass === "screen_capture" && !config?.tools?.browserEnabled) {
    return { allowed: false, reason: "screen capture is disabled by default.", requiresApproval: false };
  }

  return { allowed: true, reason: "Requires approval.", requiresApproval: true };
}
