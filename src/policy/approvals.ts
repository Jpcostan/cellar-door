import fs from "node:fs/promises";
import path from "node:path";
import { getHomeDir } from "../config/paths.js";

export interface ApprovalRecord {
  tool: string;
  expiresAt: string;
}

interface ApprovalIndex {
  version: 1;
  approvals: ApprovalRecord[];
}

function getApprovalPath(): string {
  return path.join(getHomeDir(), "approvals.json");
}

async function readIndex(): Promise<ApprovalIndex> {
  try {
    const raw = await fs.readFile(getApprovalPath(), "utf-8");
    const parsed = JSON.parse(raw) as ApprovalIndex;
    if (parsed?.version !== 1 || !Array.isArray(parsed.approvals)) {
      throw new Error("Invalid approvals index");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, approvals: [] };
    }
    throw error;
  }
}

async function writeIndex(index: ApprovalIndex): Promise<void> {
  await fs.mkdir(getHomeDir(), { recursive: true, mode: 0o700 });
  await fs.writeFile(getApprovalPath(), JSON.stringify(index, null, 2), { mode: 0o600 });
}

export async function grantApproval(tool: string, ttlSeconds: number): Promise<void> {
  const index = await readIndex();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const filtered = index.approvals.filter((entry) => entry.tool !== tool);
  filtered.push({ tool, expiresAt });
  await writeIndex({ version: 1, approvals: filtered });
}

export async function hasValidApproval(tool: string): Promise<boolean> {
  const index = await readIndex();
  const now = Date.now();
  const valid = index.approvals.filter((entry) => Date.parse(entry.expiresAt) > now);
  if (valid.length !== index.approvals.length) {
    await writeIndex({ version: 1, approvals: valid });
  }
  return valid.some((entry) => entry.tool === tool);
}
