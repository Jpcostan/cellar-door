export type MemoryScope = "org" | "team" | "project" | "user";
export type MemoryType = "fact" | "lesson" | "decision" | "snippet";

export interface MemoryCardMeta {
  id: string;
  type: MemoryType;
  tags: string[];
  scope: MemoryScope;
  importance: number;
  createdAt: string;
}

export interface MemoryCard extends MemoryCardMeta {
  content: string;
}

export interface MemoryIndexEntry extends MemoryCardMeta {
  path: string;
  tokens: number;
  excerpt: string;
}

export interface MemoryIndex {
  version: 1;
  cards: MemoryIndexEntry[];
}
