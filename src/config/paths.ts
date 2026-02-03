import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const ENV_HOME = "CELLAR_DOOR_HOME";

export function getHomeDir(): string {
  const override = process.env[ENV_HOME];
  if (override && override.trim().length > 0) {
    return override;
  }
  const defaultHome = path.join(os.homedir(), ".cellar-door");
  const pointerPath = path.join(defaultHome, "team-root");
  try {
    const sharedRoot = fs.readFileSync(pointerPath, "utf-8").trim();
    if (sharedRoot.length > 0) {
      return sharedRoot;
    }
  } catch {
    // ignore missing pointer
  }
  return defaultHome;
}

export function getConfigPath(): string {
  return path.join(getHomeDir(), "config.json");
}

export function getBootstrapDir(): string {
  return path.join(getHomeDir(), "bootstrap");
}

export function getMemoryDir(): string {
  return path.join(getHomeDir(), "memory");
}

export function getCardsDir(): string {
  return path.join(getMemoryDir(), "cards");
}

export function getHotPath(): string {
  return path.join(getMemoryDir(), "hot.md");
}

export function getIndexPath(): string {
  return path.join(getMemoryDir(), "index.json");
}

export function getSessionsDir(): string {
  return path.join(getHomeDir(), "sessions");
}

export function getAuditDir(): string {
  return path.join(getHomeDir(), "audit");
}

export function getAuditLogPath(): string {
  return path.join(getAuditDir(), "audit.log");
}
