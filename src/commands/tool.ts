import type { Logger } from "../logging/logger.js";
import type { ToolRegistry } from "../tools/registry.js";

export async function runToolList(registry: ToolRegistry, logger: Logger): Promise<void> {
  const tools = registry.list();
  for (const tool of tools) {
    logger.info("Tool", { name: tool.name, sideEffectClass: tool.sideEffectClass });
  }
}

export async function runToolDescribe(name: string, registry: ToolRegistry, logger: Logger): Promise<void> {
  const tool = registry.get(name);
  if (!tool) {
    logger.error("Tool not found.", { name });
    return;
  }
  logger.info("Tool", { tool });
}
