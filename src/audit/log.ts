import fs from "node:fs/promises";
import { getAuditDir, getAuditLogPath } from "../config/paths.js";

export interface AuditRecord {
  ts: string;
  type: "model" | "tool" | "approval" | "policy";
  actor: string;
  message: string;
  data?: Record<string, unknown>;
}

export function resolveActor(config: { userIdentity?: string | undefined } | null, fallback: string): string {
  return config?.userIdentity ?? fallback;
}

export async function appendAudit(record: AuditRecord): Promise<void> {
  await fs.mkdir(getAuditDir(), { recursive: true, mode: 0o700 });
  const line = JSON.stringify(record);
  await fs.appendFile(getAuditLogPath(), `${line}\n`, { mode: 0o600 });
}

export async function readAudit(limit = 100): Promise<AuditRecord[]> {
  try {
    const raw = await fs.readFile(getAuditLogPath(), "utf-8");
    const lines = raw.trim().split(/\n+/).filter(Boolean);
    return lines.slice(-limit).map((line) => JSON.parse(line) as AuditRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
