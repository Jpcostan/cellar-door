import fs from "node:fs/promises";
import { Config, ConfigSchema, DEFAULT_CONFIG } from "./schema.js";
import { getConfigPath, getHomeDir } from "./paths.js";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export async function ensureHomeDir(): Promise<string> {
  const homeDir = getHomeDir();
  await fs.mkdir(homeDir, { recursive: true, mode: 0o700 });
  return homeDir;
}

export async function loadConfig(): Promise<Config | null> {
  const configPath = getConfigPath();
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = ConfigSchema.safeParse(parsed);
    if (!result.success) {
      throw new ConfigError("Config validation failed");
    }
    return result.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    if (error instanceof SyntaxError) {
      throw new ConfigError("Config file is not valid JSON");
    }
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError("Failed to load config");
  }
}

export async function writeConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const validated = ConfigSchema.safeParse(config);
  if (!validated.success) {
    throw new ConfigError("Config validation failed");
  }
  await ensureHomeDir();
  const payload = JSON.stringify(validated.data, null, 2);
  await fs.writeFile(configPath, payload, { mode: 0o600 });
}

export async function initConfigIfMissing(): Promise<Config> {
  const existing = await loadConfig();
  if (existing) {
    return existing;
  }
  await writeConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}
