import type { Logger } from "../logging/logger.js";
import { addMemoryCard, compactHotSummary, compactSessionsToCard, gcIndex, readHotSummaryText, searchMemory } from "../memory/operations.js";
import type { MemoryScope, MemoryType } from "../memory/types.js";
import { loadConfig } from "../config/load.js";

function parseTags(raw?: string): string[] {
  if (!raw) {
    return [];
  }
  return raw.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export async function runMemoryAdd(
  content: string,
  options: { tags?: string; scope?: MemoryScope; type?: MemoryType; importance?: number },
  logger: Logger
): Promise<void> {
  const input: { content: string; tags: string[]; scope?: MemoryScope; type?: MemoryType; importance?: number } = {
    content,
    tags: parseTags(options.tags),
  };
  if (options.scope) input.scope = options.scope;
  if (options.type) input.type = options.type;
  if (typeof options.importance === "number") input.importance = options.importance;
  const entry = await addMemoryCard(input);
  logger.info("Memory added.", { id: entry.id, scope: entry.scope, tags: entry.tags });
}

export async function runMemorySearch(
  query: string,
  options: { scope?: MemoryScope; limit?: number },
  logger: Logger
): Promise<void> {
  const input: { query: string; scope?: MemoryScope; limit?: number } = { query };
  if (options.scope) input.scope = options.scope;
  if (typeof options.limit === "number") input.limit = options.limit;
  const results = await searchMemory(input);
  if (results.length === 0) {
    logger.info("No memory matches.");
    return;
  }
  for (const entry of results) {
    logger.info("Memory", { id: entry.id, scope: entry.scope, tags: entry.tags, excerpt: entry.excerpt });
  }
}

export async function runMemoryCompact(logger: Logger): Promise<void> {
  const config = await loadConfig();
  const hotMax = config?.tokenBudgets?.hotMax ?? 512;
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  const summary = await compactHotSummary({ maxTokens: hotMax, estimateTokens });
  const card = await compactSessionsToCard();
  logger.info("Hot summary updated.", { tokens: hotMax, length: summary.length, card: card?.id ?? null });
}

export async function runMemoryGc(logger: Logger): Promise<void> {
  const result = await gcIndex();
  logger.info("Memory index GC complete.", result);
}

export async function runMemoryShowHot(logger: Logger): Promise<void> {
  const content = await readHotSummaryText();
  if (!content) {
    logger.info("Hot summary is empty.");
    return;
  }
  logger.info("Hot summary", { content });
}
