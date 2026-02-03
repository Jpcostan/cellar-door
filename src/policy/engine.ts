import path from "node:path";
import type { Config } from "../config/schema.js";
import type { ToolDefinition } from "../protocol/types.js";

export interface PolicyResult {
  allowed: boolean;
  reason: string;
}

function normalizePaths(paths: string[] | undefined): string[] {
  return (paths ?? []).map((p) => path.resolve(p));
}

export function isToolAllowed(tool: ToolDefinition, config: Config | null): PolicyResult {
  const allow = config?.policy?.allowTools ?? [];
  const deny = config?.policy?.denyTools ?? [];

  if (deny.includes(tool.name)) {
    return { allowed: false, reason: `Tool ${tool.name} denied by policy.` };
  }
  if (allow.length > 0 && !allow.includes(tool.name)) {
    return { allowed: false, reason: `Tool ${tool.name} not in allowlist.` };
  }
  return { allowed: true, reason: "Tool allowed by policy." };
}

export function isPathAllowed(targetPath: string, config: Config | null): PolicyResult {
  const allow = normalizePaths(config?.policy?.allowPaths);
  const deny = normalizePaths(config?.policy?.denyPaths);
  const resolved = path.resolve(targetPath);

  if (deny.some((p) => resolved.startsWith(p))) {
    return { allowed: false, reason: "Path denied by policy." };
  }
  if (allow.length > 0 && !allow.some((p) => resolved.startsWith(p))) {
    return { allowed: false, reason: "Path not in allowlist." };
  }
  return { allowed: true, reason: "Path allowed by policy." };
}

export function isDomainAllowed(domain: string, config: Config | null): PolicyResult {
  const allow = config?.policy?.allowDomains ?? [];
  const deny = config?.policy?.denyDomains ?? [];

  if (deny.includes(domain)) {
    return { allowed: false, reason: "Domain denied by policy." };
  }
  if (allow.length > 0 && !allow.includes(domain)) {
    return { allowed: false, reason: "Domain not in allowlist." };
  }
  return { allowed: true, reason: "Domain allowed by policy." };
}

export function isUiAllowed(config: Config | null): PolicyResult {
  if (config?.policy?.allowUi === false) {
    return { allowed: false, reason: "UI control denied by policy." };
  }
  return { allowed: true, reason: "UI control allowed by policy." };
}

export function isModelAllowed(providerKind: string, config: Config | null): PolicyResult {
  const approved = config?.approvedModelProviders ?? [];
  if (approved.length === 0) {
    return { allowed: true, reason: "No approved provider list; allowing." };
  }
  if (!approved.includes(providerKind)) {
    return { allowed: false, reason: "Model provider not approved." };
  }
  return { allowed: true, reason: "Model provider approved." };
}
