import fs from "node:fs/promises";
import path from "node:path";
import { getSessionsDir } from "../config/paths.js";

function getSessionFilePath(date = new Date()): string {
  const name = date.toISOString().slice(0, 10);
  return path.join(getSessionsDir(), `${name}.md`);
}

export async function appendSessionLog(entry: string): Promise<void> {
  await fs.mkdir(getSessionsDir(), { recursive: true, mode: 0o700 });
  const filePath = getSessionFilePath();
  await fs.appendFile(filePath, entry, { mode: 0o600 });
}
