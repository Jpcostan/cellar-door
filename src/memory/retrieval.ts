import fs from "node:fs/promises";
import path from "node:path";
import { getBootstrapDir } from "../config/paths.js";
import { readHotSummary, readIndex } from "./store.js";
import { MemoryIndexEntry, MemoryScope } from "./types.js";

export interface RetrievedMemory {
  items: string[];
  tokensUsed: number;
}

export interface RetrievalBudget {
  bootstrapMax: number;
  hotMax: number;
  warmMax: number;
}

export interface RetrievalOptions {
  task: string;
  scope: MemoryScope;
  budget: RetrievalBudget;
  estimateTokens: (text: string) => number;
}

async function readBootstrap(): Promise<string> {
  try {
    const dir = getBootstrapDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => path.join(dir, entry.name));
    const contents = await Promise.all(files.map((file) => fs.readFile(file, "utf-8")));
    return contents.join("\n\n");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function scoreEntry(entry: MemoryIndexEntry, query: string, scope: MemoryScope): number {
  const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const excerpt = entry.excerpt.toLowerCase();
  const tagMatches = entry.tags.filter((tag) => queryTokens.includes(tag.toLowerCase())).length;
  const wordMatches = queryTokens.filter((token) => excerpt.includes(token)).length;
  const scopeBoost = entry.scope === scope ? 1 : 0;
  return tagMatches * 3 + wordMatches + entry.importance + scopeBoost;
}

function rankEntries(entries: MemoryIndexEntry[], query: string, scope: MemoryScope): MemoryIndexEntry[] {
  return [...entries].sort((a, b) => scoreEntry(b, query, scope) - scoreEntry(a, query, scope));
}

function capByBudget(text: string, budget: number, estimateTokens: (input: string) => number): string {
  if (budget <= 0) {
    return "";
  }
  if (estimateTokens(text) <= budget) {
    return text;
  }
  const ratio = budget / Math.max(estimateTokens(text), 1);
  const sliceLen = Math.max(0, Math.floor(text.length * ratio));
  return text.slice(0, sliceLen).trim();
}

export async function retrieveMemory(options: RetrievalOptions): Promise<RetrievedMemory> {
  const items: string[] = [];
  let tokensUsed = 0;

  const bootstrap = await readBootstrap();
  if (bootstrap) {
    const capped = capByBudget(bootstrap, options.budget.bootstrapMax, options.estimateTokens);
    if (capped) {
      items.push(`Bootstrap:\n${capped}`);
      tokensUsed += options.estimateTokens(capped);
    }
  }

  const hot = await readHotSummary();
  if (hot) {
    const capped = capByBudget(hot, options.budget.hotMax, options.estimateTokens);
    if (capped) {
      items.push(`Hot Summary:\n${capped}`);
      tokensUsed += options.estimateTokens(capped);
    }
  }

  const index = await readIndex();
  const ranked = rankEntries(index.cards, options.task, options.scope);
  let warmTokens = 0;

  for (const entry of ranked) {
    if (warmTokens + entry.tokens > options.budget.warmMax) {
      continue;
    }
    items.push(`Memory (${entry.id}):\n${entry.excerpt}`);
    warmTokens += entry.tokens;
  }

  tokensUsed += warmTokens;

  return { items, tokensUsed };
}
