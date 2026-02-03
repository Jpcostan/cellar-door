import fs from "node:fs/promises";
import path from "node:path";
import { getHomeDir } from "../config/paths.js";
import { PluginManifest, PluginManifestSchema } from "./schema.js";

export interface PluginRecord {
  name: string;
  version: string;
  path: string;
  manifest: PluginManifest;
}

interface PluginIndex {
  version: 1;
  plugins: PluginRecord[];
}

function getPluginDir(): string {
  return path.join(getHomeDir(), "plugins");
}

function getPluginIndexPath(): string {
  return path.join(getPluginDir(), "index.json");
}

export async function ensurePluginDir(): Promise<void> {
  await fs.mkdir(getPluginDir(), { recursive: true, mode: 0o700 });
}

export async function readPluginIndex(): Promise<PluginIndex> {
  try {
    const raw = await fs.readFile(getPluginIndexPath(), "utf-8");
    const parsed = JSON.parse(raw) as PluginIndex;
    if (parsed?.version !== 1 || !Array.isArray(parsed.plugins)) {
      throw new Error("Invalid plugin index");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, plugins: [] };
    }
    throw error;
  }
}

export async function writePluginIndex(index: PluginIndex): Promise<void> {
  await ensurePluginDir();
  await fs.writeFile(getPluginIndexPath(), JSON.stringify(index, null, 2), { mode: 0o600 });
}

export async function addPlugin(record: PluginRecord): Promise<void> {
  const index = await readPluginIndex();
  const filtered = index.plugins.filter((plugin) => plugin.name !== record.name);
  filtered.push(record);
  await writePluginIndex({ version: 1, plugins: filtered });
}

export async function removePlugin(name: string): Promise<void> {
  const index = await readPluginIndex();
  const filtered = index.plugins.filter((plugin) => plugin.name !== name);
  await writePluginIndex({ version: 1, plugins: filtered });
}

export async function loadManifest(pluginPath: string): Promise<PluginManifest> {
  const raw = await fs.readFile(path.join(pluginPath, "plugin.json"), "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = PluginManifestSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Plugin manifest invalid");
  }
  return result.data;
}

export async function verifyPlugin(pluginPath: string): Promise<PluginManifest> {
  const manifest = await loadManifest(pluginPath);
  await fs.access(path.join(pluginPath, manifest.entry));
  return manifest;
}
