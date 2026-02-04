import fs from "node:fs/promises";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { DEFAULT_CONFIG, ModelProviderConfig } from "../config/schema.js";
import { ensureHomeDir, loadConfig, writeConfig } from "../config/load.js";
import { getConfigPath, getHomeDir } from "../config/paths.js";
import { loadEnvFromHome, writeEnvToHome } from "../config/env.js";
import type { Logger } from "../logging/logger.js";

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase().startsWith("y");
  } finally {
    rl.close();
  }
}

async function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function promptRequired(question: string): Promise<string> {
  while (true) {
    const value = (await promptInput(question)).trim();
    if (value) return value;
  }
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function expandEnv(value: string): string {
  const withBraces = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) => {
    return process.env[name] ?? match;
  });
  return withBraces.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, name: string) => {
    return process.env[name] ?? match;
  });
}

function expandHeaders(headers: Record<string, string>): Record<string, string> {
  const entries = Object.entries(headers).map(([key, value]) => [key, expandEnv(value)]);
  return Object.fromEntries(entries);
}

type ModelsCacheEntry = {
  models: string[];
  fetchedAt: string;
};

type ModelsCache = {
  entries: Record<string, ModelsCacheEntry>;
};

const MODELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKeyForModels(baseUrl: string, headers: Record<string, string>): string {
  const normalizedHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
  const payload = `${baseUrl}|${normalizedHeaders}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function readModelsCache(): Promise<ModelsCache> {
  const path = `${getHomeDir()}/models-cache.json`;
  try {
    const raw = await fs.readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as ModelsCache;
    if (!parsed || typeof parsed !== "object" || !parsed.entries || typeof parsed.entries !== "object") {
      return { entries: {} };
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: {} };
    }
    return { entries: {} };
  }
}

async function writeModelsCache(key: string, models: string[]): Promise<void> {
  await ensureHomeDir();
  const cache = await readModelsCache();
  cache.entries[key] = { models, fetchedAt: new Date().toISOString() };
  const path = `${getHomeDir()}/models-cache.json`;
  await fs.writeFile(path, JSON.stringify(cache, null, 2), { mode: 0o600 });
}

function isCacheFresh(entry: ModelsCacheEntry): boolean {
  const timestamp = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < MODELS_CACHE_TTL_MS;
}

async function promptSelect<T>(question: string, options: Array<{ label: string; value: T }>, defaultIndex = 0): Promise<T> {
  if (options.length === 0) {
    throw new Error("No options available for selection.");
  }
  const lines = options.map((option, index) => `${index + 1}) ${option.label}`).join("\n");
  const prompt = `${question}\n${lines}\nChoose [${defaultIndex + 1}]: `;
  while (true) {
    const answer = (await promptInput(prompt)).trim();
    if (!answer) {
      const fallback = options[defaultIndex];
      if (!fallback) {
        throw new Error("Invalid default selection.");
      }
      return fallback.value;
    }
    const selection = Number.parseInt(answer, 10);
    if (Number.isFinite(selection) && selection >= 1 && selection <= options.length) {
      const chosen = options[selection - 1];
      if (!chosen) {
        throw new Error("Invalid selection.");
      }
      return chosen.value;
    }
  }
}

async function fetchModelList(baseUrl: string, headers: Record<string, string>, logger: Logger): Promise<string[]> {
  const url = new URL("models", ensureTrailingSlash(baseUrl));
  const key = cacheKeyForModels(baseUrl, headers);
  const cache = await readModelsCache();
  const cached = cache.entries[key];
  if (cached && isCacheFresh(cached)) {
    return cached.models;
  }

  const delays = [500, 1500, 3000];
  let lastError: unknown;
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Model list HTTP error: ${response.status}`);
      }
      const payload = (await response.json()) as unknown;
      const models: string[] = [];
      if (Array.isArray((payload as { data?: unknown }).data)) {
        for (const item of (payload as { data: unknown[] }).data) {
          if (typeof item === "string") {
            models.push(item);
            continue;
          }
          if (item && typeof (item as { id?: unknown }).id === "string") {
            models.push((item as { id: string }).id);
            continue;
          }
          if (item && typeof (item as { name?: unknown }).name === "string") {
            models.push((item as { name: string }).name);
          }
        }
      } else if (Array.isArray(payload)) {
        for (const item of payload) {
          if (typeof item === "string") {
            models.push(item);
          }
        }
      }
      const unique = Array.from(new Set(models)).sort((a, b) => a.localeCompare(b));
      if (unique.length === 0) {
        throw new Error("No models returned by provider.");
      }
      await writeModelsCache(key, unique);
      return unique;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "Failed to fetch model list.";
      logger.warn(message);
      if (attempt < delays.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (cached) {
    logger.warn("Using cached model list from previous setup.", { fetchedAt: cached.fetchedAt });
    return cached.models;
  }

  const message = lastError instanceof Error ? lastError.message : "Failed to fetch model list.";
  logger.error(message);
  throw lastError instanceof Error ? lastError : new Error(message);
}

async function promptModelFromList(models: string[]): Promise<string> {
  let current = models;
  while (true) {
    if (current.length === 0) {
      const term = await promptRequired("No matches. Enter a filter term: ");
      current = models.filter((model) => model.toLowerCase().includes(term.toLowerCase()));
      continue;
    }
    if (current.length > 50) {
      const term = await promptRequired(`Found ${current.length} models. Enter a filter term to narrow: `);
      current = models.filter((model) => model.toLowerCase().includes(term.toLowerCase()));
      continue;
    }
    return promptSelect("Select a model:", current.map((model) => ({ label: model, value: model })));
  }
}

async function ensureEnvVar(logger: Logger, envName: string, promptLabel?: string): Promise<void> {
  await loadEnvFromHome();
  if (process.env[envName]) {
    return;
  }
  const label = promptLabel ?? envName;
  const key = await promptRequired(`${label} (will be stored in ~/.cellar-door/.env): `);
  await writeEnvToHome({ [envName]: key });
  process.env[envName] = key;
  logger.info(`Saved ${envName} to ~/.cellar-door/.env`);
}

async function configureOpenAiProvider(logger: Logger): Promise<ModelProviderConfig | null> {
  await ensureEnvVar(logger, "OPENAI_API_KEY", "OpenAI API key");
  const headers = { Authorization: "Bearer $OPENAI_API_KEY" };
  const models = await fetchModelList("https://api.openai.com/v1", expandHeaders(headers), logger);
  const model = await promptModelFromList(models);
  return {
    kind: "http",
    baseUrl: "https://api.openai.com/v1",
    model,
    headers,
  };
}

async function configureHttpProvider(logger: Logger): Promise<ModelProviderConfig | null> {
  const baseUrl = await promptRequired("Base URL (OpenAI-compatible HTTP endpoint): ");
  const wantsAuth = await promptYesNo("Add Authorization header from env var? (y/N) ");
  let headers: Record<string, string> | undefined;
  if (wantsAuth) {
    const envName = (await promptInput("Env var name (default: OPENAI_API_KEY): ")).trim() || "OPENAI_API_KEY";
    await ensureEnvVar(logger, envName, `${envName} value`);
    headers = { Authorization: `Bearer $${envName}` };
    logger.info(`Using Authorization header from $${envName}.`);
  }
  const models = await fetchModelList(baseUrl, expandHeaders(headers ?? {}), logger);
  const model = await promptModelFromList(models);
  return {
    kind: "http",
    baseUrl,
    model,
    ...(headers ? { headers } : {}),
  };
}

async function configureOllamaProvider(): Promise<ModelProviderConfig> {
  const model = await promptRequired("Model name: ");
  const baseUrl = (await promptInput("Base URL (leave empty for default): ")).trim();
  return {
    kind: "ollama",
    model,
    ...(baseUrl ? { baseUrl } : {}),
  };
}

async function configureLmStudioProvider(): Promise<ModelProviderConfig> {
  const model = await promptRequired("Model name: ");
  const baseUrl = (await promptInput("Base URL (leave empty for default): ")).trim();
  return {
    kind: "lmstudio",
    model,
    ...(baseUrl ? { baseUrl } : {}),
  };
}

async function configureModelProvider(logger: Logger): Promise<ModelProviderConfig | null> {
  const flow = await promptSelect("Setup mode:", [
    { label: "Quickstart (recommended)", value: "quick" as const },
    { label: "Advanced", value: "advanced" as const },
  ]);

  if (flow === "quick") {
    return configureOpenAiProvider(logger);
  }

  const provider = await promptSelect("Choose model provider:", [
    { label: "OpenAI (recommended)", value: "openai" as const },
    { label: "OpenAI-compatible HTTP", value: "http" as const },
    { label: "Ollama (local)", value: "ollama" as const },
    { label: "LM Studio (local)", value: "lmstudio" as const },
    { label: "Skip for now", value: "skip" as const },
  ]);

  if (provider === "skip") {
    return null;
  }
  if (provider === "openai") {
    return configureOpenAiProvider(logger);
  }
  if (provider === "http") {
    return configureHttpProvider(logger);
  }
  if (provider === "ollama") {
    return configureOllamaProvider();
  }
  return configureLmStudioProvider();
}

export async function runInit(logger: Logger, options?: { force?: boolean }): Promise<void> {
  await ensureHomeDir();
  const existing = await loadConfig();
  if (existing && !options?.force) {
    if (isInteractive()) {
      const wants = await promptYesNo("Config already exists. Reconfigure model provider? (y/N) ");
      if (!wants) {
        logger.info("Config already exists.", { path: getConfigPath() });
        return;
      }
    } else {
      logger.info("Config already exists.", { path: getConfigPath() });
      return;
    }
  }

  let modelProvider: ModelProviderConfig | null = null;
  if (isInteractive()) {
    modelProvider = await configureModelProvider(logger);
  } else {
    logger.info("Non-interactive setup: skipping model provider setup.");
  }

  const base = existing ?? DEFAULT_CONFIG;
  await writeConfig({ ...base, modelProvider });
  logger.info("Initialized cellar-door.", { path: getConfigPath() });
}
