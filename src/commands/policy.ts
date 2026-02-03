import type { Logger } from "../logging/logger.js";
import type { Config } from "../config/schema.js";
import type { ToolDefinition } from "../protocol/types.js";
import { isToolAllowed, isPathAllowed, isDomainAllowed, isUiAllowed, isModelAllowed } from "../policy/engine.js";
import { grantApproval } from "../policy/approvals.js";

export async function runPolicyCheck(tool: ToolDefinition, config: Config | null, logger: Logger): Promise<void> {
  const result = isToolAllowed(tool, config);
  logger.info("Policy check", { tool: tool.name, allowed: result.allowed, reason: result.reason });
}

export async function runPolicyExplain(config: Config | null, logger: Logger): Promise<void> {
  logger.info("Policy", { policy: config?.policy ?? {} });
}

export async function runPolicyApprove(toolName: string, ttlSeconds: number, logger: Logger): Promise<void> {
  await grantApproval(toolName, ttlSeconds);
  logger.info("Policy approval recorded.", { tool: toolName, ttlSeconds });
}

export async function runPolicyCheckPath(pathValue: string, config: Config | null, logger: Logger): Promise<void> {
  const result = isPathAllowed(pathValue, config);
  logger.info("Policy path check", { path: pathValue, allowed: result.allowed, reason: result.reason });
}

export async function runPolicyCheckDomain(domain: string, config: Config | null, logger: Logger): Promise<void> {
  const result = isDomainAllowed(domain, config);
  logger.info("Policy domain check", { domain, allowed: result.allowed, reason: result.reason });
}

export async function runPolicyCheckUi(config: Config | null, logger: Logger): Promise<void> {
  const result = isUiAllowed(config);
  logger.info("Policy ui check", { allowed: result.allowed, reason: result.reason });
}

export async function runPolicyCheckModel(provider: string, config: Config | null, logger: Logger): Promise<void> {
  const result = isModelAllowed(provider, config);
  logger.info("Policy model check", { provider, allowed: result.allowed, reason: result.reason });
}
