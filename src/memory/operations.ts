import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getCardsDir, getSessionsDir } from "../config/paths.js";
import { addToIndex, buildIndexEntry, readIndex, writeIndex, writeHotSummary, readHotSummary, writeMemoryCard } from "./store.js";
import { MemoryCard, MemoryIndexEntry, MemoryScope, MemoryType } from "./types.js";

const DEFAULT_SCOPE: MemoryScope = "project";
const DEFAULT_TYPE: MemoryType = "fact";

export interface AddMemoryInput {
  content: string;
  tags: string[];
  scope?: MemoryScope;
  type?: MemoryType;
  importance?: number;
  estimateTokens?: (text: string) => number;
}

export interface SearchOptions {
  query: string;
  scope?: MemoryScope;
  limit?: number;
}

export interface CompactOptions {
  maxTokens: number;
  estimateTokens: (text: string) => number;
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildId(): string {
  return `mem_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function addMemoryCard(input: AddMemoryInput): Promise<MemoryIndexEntry> {
  if (!input.content.trim()) {
    throw new Error("Memory content cannot be empty.");
  }
  const importance = Math.min(1, Math.max(0, input.importance ?? 0.5));
  const card: MemoryCard = {
    id: buildId(),
    type: input.type ?? DEFAULT_TYPE,
    tags: normalizeTags(input.tags),
    scope: input.scope ?? DEFAULT_SCOPE,
    importance,
    createdAt: new Date().toISOString().slice(0, 10),
    content: input.content.trim(),
  };

  const estimator = input.estimateTokens ?? estimateTokens;
  const tokens = estimator(card.content);
  const filePath = await writeMemoryCard(card);
  const entry = buildIndexEntry(card, filePath, tokens);
  await addToIndex(entry);
  return entry;
}

function matchesQuery(entry: MemoryIndexEntry, queryTokens: string[], scope?: MemoryScope): boolean {
  if (scope && entry.scope !== scope) {
    return false;
  }
  const haystack = `${entry.excerpt} ${entry.tags.join(" ")}`.toLowerCase();
  return queryTokens.some((token) => haystack.includes(token));
}

function scoreEntry(entry: MemoryIndexEntry, queryTokens: string[]): number {
  const haystack = `${entry.excerpt} ${entry.tags.join(" ")}`.toLowerCase();
  const matches = queryTokens.filter((token) => haystack.includes(token)).length;
  return matches + entry.importance;
}

export async function searchMemory(options: SearchOptions): Promise<MemoryIndexEntry[]> {
  const index = await readIndex();
  const tokens = options.query.toLowerCase().split(/\W+/).filter(Boolean);
  const filtered = index.cards.filter((entry) => matchesQuery(entry, tokens, options.scope));
  const sorted = filtered.sort((a, b) => scoreEntry(b, tokens) - scoreEntry(a, tokens));
  return sorted.slice(0, options.limit ?? 5);
}

export async function compactHotSummary(options: CompactOptions): Promise<string> {
  const index = await readIndex();
  const sorted = [...index.cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let content = "";
  let tokensUsed = 0;

  for (const entry of sorted) {
    const line = `- ${entry.excerpt}`;
    const estimate = options.estimateTokens(line);
    if (tokensUsed + estimate > options.maxTokens) {
      break;
    }
    content = content ? `${content}\n${line}` : line;
    tokensUsed += estimate;
  }

  await writeHotSummary(content);
  return content;
}

export async function compactSessionsToCard(): Promise<MemoryIndexEntry | null> {
  const sessionsDir = getSessionsDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(sessionsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
  if (files.length === 0) {
    return null;
  }
  const latest = files.sort().at(-1);
  if (!latest) {
    return null;
  }
  const raw = await fs.readFile(path.join(sessionsDir, latest), "utf-8");
  const snippet = raw.trim().slice(0, 800);
  if (!snippet) {
    return null;
  }
  return addMemoryCard({
    content: snippet,
    tags: ["session"],
    type: "snippet",
    scope: "project",
  });
}

export async function gcIndex(): Promise<{ removed: number; remaining: number }> {
  const index = await readIndex();
  const cardsDir = getCardsDir();
  const existing = new Set<string>();
  try {
    const files = await fs.readdir(cardsDir);
    for (const file of files) {
      existing.add(file);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const nextCards = index.cards.filter((entry) => existing.has(path.basename(entry.path)));
  const removed = index.cards.length - nextCards.length;
  if (removed > 0) {
    await writeIndex({ version: 1, cards: nextCards });
  }
  return { removed, remaining: nextCards.length };
}

export async function readHotSummaryText(): Promise<string> {
  return readHotSummary();
}
