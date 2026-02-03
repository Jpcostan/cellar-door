import fs from "node:fs/promises";
import { getHomeDir } from "./paths.js";

type EnvMap = Record<string, string>;

function parseEnv(raw: string): EnvMap {
  const entries: EnvMap = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (!key) continue;
    let value = match[2] ?? "";
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

async function readEnvFile(): Promise<EnvMap> {
  const path = `${getHomeDir()}/.env`;
  try {
    const raw = await fs.readFile(path, "utf-8");
    return parseEnv(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function loadEnvFromHome(): Promise<EnvMap> {
  const env = await readEnvFile();
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return env;
}

export async function writeEnvToHome(updates: EnvMap): Promise<void> {
  await fs.mkdir(getHomeDir(), { recursive: true, mode: 0o700 });
  const current = await readEnvFile();
  const merged = { ...current, ...updates };
  const lines = Object.keys(merged)
    .sort()
    .map((key) => `${key}=${merged[key]}`);
  const payload = `${lines.join("\n")}\n`;
  const path = `${getHomeDir()}/.env`;
  await fs.writeFile(path, payload, { mode: 0o600 });
}
