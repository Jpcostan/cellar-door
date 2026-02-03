import type { SideEffectClass, ToolDefinition } from "../protocol/types.js";
import type { Config } from "../config/schema.js";
import { isToolAllowed, isUiAllowed } from "../policy/engine.js";

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
}

const RISKY: SideEffectClass[] = ["writes_files", "network", "exec", "ui_control", "screen_capture", "money", "admin"];

export function evaluateToolPolicy(tool: ToolDefinition, config: Config | null): PolicyDecision {
  const isRisky = RISKY.includes(tool.sideEffectClass);
  const toolPolicy = isToolAllowed(tool, config);
  if (!toolPolicy.allowed) {
    return { allowed: false, reason: toolPolicy.reason, requiresApproval: false };
  }

  if (!isRisky) {
    return { allowed: true, reason: "Read-only tool.", requiresApproval: false };
  }

  if (tool.sideEffectClass === "exec" && !config?.tools?.execEnabled) {
    return { allowed: false, reason: "exec is disabled by default.", requiresApproval: false };
  }

  if (tool.sideEffectClass === "ui_control") {
    const uiAllowed = isUiAllowed(config);
    if (!uiAllowed.allowed) {
      return { allowed: false, reason: uiAllowed.reason, requiresApproval: false };
    }
    if (!config?.tools?.browserEnabled) {
      return { allowed: false, reason: "browser automation is disabled by default.", requiresApproval: false };
    }
  }

  if (tool.sideEffectClass === "screen_capture") {
    const uiAllowed = isUiAllowed(config);
    if (!uiAllowed.allowed) {
      return { allowed: false, reason: uiAllowed.reason, requiresApproval: false };
    }
    if (!config?.tools?.browserEnabled) {
      return { allowed: false, reason: "screen capture is disabled by default.", requiresApproval: false };
    }
  }

  return { allowed: true, reason: "Requires approval.", requiresApproval: true };
}
