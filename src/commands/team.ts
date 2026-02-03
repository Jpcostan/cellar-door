import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Logger } from "../logging/logger.js";

interface TeamInfo {
  name: string;
  createdAt: string;
}

function getPointerPath(): string {
  return path.join(os.homedir(), ".cellar-door", "team-root");
}

async function writePointer(sharedRoot: string): Promise<void> {
  const pointerPath = getPointerPath();
  await fs.mkdir(path.dirname(pointerPath), { recursive: true, mode: 0o700 });
  await fs.writeFile(pointerPath, sharedRoot, { mode: 0o600 });
}

export async function runTeamInit(sharedRoot: string, name: string, logger: Logger): Promise<void> {
  await fs.mkdir(sharedRoot, { recursive: true, mode: 0o700 });
  const info: TeamInfo = { name, createdAt: new Date().toISOString() };
  await fs.writeFile(path.join(sharedRoot, "team.json"), JSON.stringify(info, null, 2), { mode: 0o600 });
  await writePointer(sharedRoot);
  logger.info("Team initialized.", { sharedRoot, name });
}

export async function runTeamJoin(sharedRoot: string, logger: Logger): Promise<void> {
  await fs.access(sharedRoot);
  await writePointer(sharedRoot);
  logger.info("Joined team.", { sharedRoot });
}

export async function runTeamSync(logger: Logger): Promise<void> {
  const pointerPath = getPointerPath();
  try {
    const sharedRoot = (await fs.readFile(pointerPath, "utf-8")).trim();
    if (!sharedRoot) {
      logger.warn("No team shared root configured.");
      return;
    }
    await fs.mkdir(sharedRoot, { recursive: true, mode: 0o700 });
    logger.info("Team sync complete.", { sharedRoot });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.warn("No team shared root configured.");
      return;
    }
    throw error;
  }
}
