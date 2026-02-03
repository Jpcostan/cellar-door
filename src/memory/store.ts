import fs from "node:fs/promises";
import path from "node:path";
import { getBootstrapDir, getCardsDir, getHotPath, getIndexPath, getMemoryDir } from "../config/paths.js";
import { MemoryCard, MemoryIndex, MemoryIndexEntry } from "./types.js";

const FRONTMATTER_BOUNDARY = "---";

function serializeFrontmatter(meta: Omit<MemoryCard, "content">): string {
  const lines = [
    FRONTMATTER_BOUNDARY,
    `id: ${meta.id}`,
    `type: ${meta.type}`,
    `tags: [${meta.tags.join(", ")}]`,
    `scope: ${meta.scope}`,
    `importance: ${meta.importance}`,
    `created_at: ${meta.createdAt}`,
    FRONTMATTER_BOUNDARY,
  ];
  return lines.join("\n");
}

function extractExcerpt(content: string, maxLen = 160): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized;
}

export async function ensureMemoryDirs(): Promise<void> {
  await fs.mkdir(getMemoryDir(), { recursive: true, mode: 0o700 });
  await fs.mkdir(getCardsDir(), { recursive: true, mode: 0o700 });
  await fs.mkdir(getBootstrapDir(), { recursive: true, mode: 0o700 });
}

export async function readHotSummary(): Promise<string> {
  try {
    return await fs.readFile(getHotPath(), "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

export async function writeHotSummary(content: string): Promise<void> {
  await ensureMemoryDirs();
  await fs.writeFile(getHotPath(), content, { mode: 0o600 });
}

export async function readIndex(): Promise<MemoryIndex> {
  try {
    const raw = await fs.readFile(getIndexPath(), "utf-8");
    const parsed = JSON.parse(raw) as MemoryIndex;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cards)) {
      throw new Error("Invalid memory index");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, cards: [] };
    }
    throw error;
  }
}

export async function writeIndex(index: MemoryIndex): Promise<void> {
  await ensureMemoryDirs();
  await fs.writeFile(getIndexPath(), JSON.stringify(index, null, 2), { mode: 0o600 });
}

export async function writeMemoryCard(card: MemoryCard): Promise<string> {
  await ensureMemoryDirs();
  const filename = `${card.id}.md`;
  const filePath = path.join(getCardsDir(), filename);
  const frontmatter = serializeFrontmatter({
    id: card.id,
    type: card.type,
    tags: card.tags,
    scope: card.scope,
    importance: card.importance,
    createdAt: card.createdAt,
  });
  const body = `${frontmatter}\n${card.content.trim()}\n`;
  await fs.writeFile(filePath, body, { mode: 0o600 });
  return filePath;
}

export async function addToIndex(entry: MemoryIndexEntry): Promise<void> {
  const index = await readIndex();
  const nextCards = index.cards.filter((card) => card.id !== entry.id);
  nextCards.push(entry);
  await writeIndex({ version: 1, cards: nextCards });
}

export function buildIndexEntry(card: MemoryCard, filePath: string, tokens: number): MemoryIndexEntry {
  return {
    id: card.id,
    type: card.type,
    tags: card.tags,
    scope: card.scope,
    importance: card.importance,
    createdAt: card.createdAt,
    path: filePath,
    tokens,
    excerpt: extractExcerpt(card.content),
  };
}
