import os from "node:os";
import path from "node:path";

export const ENV_HOME = "CELLAR_DOOR_HOME";

export function getHomeDir(): string {
  const override = process.env[ENV_HOME];
  if (override && override.trim().length > 0) {
    return override;
  }
  return path.join(os.homedir(), ".cellar-door");
}

export function getConfigPath(): string {
  return path.join(getHomeDir(), "config.json");
}
