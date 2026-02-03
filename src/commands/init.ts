import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { DEFAULT_CONFIG, ModelProviderConfig } from "../config/schema.js";
import { ensureHomeDir, loadConfig, writeConfig } from "../config/load.js";
import { getConfigPath } from "../config/paths.js";
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

async function maybeCaptureOpenAiKey(logger: Logger): Promise<void> {
  await loadEnvFromHome();
  if (process.env.OPENAI_API_KEY) {
    return;
  }
  const wants = await promptYesNo("Set OPENAI_API_KEY now? (y/N) ");
  if (!wants) {
    logger.warn("OPENAI_API_KEY not set. You can add it later in ~/.cellar-door/.env.");
    return;
  }
  const key = await promptRequired("OpenAI API key: ");
  await writeEnvToHome({ OPENAI_API_KEY: key });
  process.env.OPENAI_API_KEY = key;
  logger.info("Saved OPENAI_API_KEY to ~/.cellar-door/.env");
}

async function configureOpenAiProvider(logger: Logger): Promise<ModelProviderConfig | null> {
  const model = await promptRequired("Model name: ");
  await maybeCaptureOpenAiKey(logger);
  return {
    kind: "http",
    baseUrl: "https://api.openai.com/v1",
    model,
    headers: {
      Authorization: "Bearer $OPENAI_API_KEY",
    },
  };
}

async function configureHttpProvider(logger: Logger): Promise<ModelProviderConfig | null> {
  const baseUrl = await promptRequired("Base URL (OpenAI-compatible HTTP endpoint): ");
  const model = await promptRequired("Model name: ");
  const wantsAuth = await promptYesNo("Add Authorization header from env var? (y/N) ");
  let headers: Record<string, string> | undefined;
  if (wantsAuth) {
    const envName = (await promptInput("Env var name (default: OPENAI_API_KEY): ")).trim() || "OPENAI_API_KEY";
    headers = { Authorization: `Bearer $${envName}` };
    logger.info(`Using Authorization header from $${envName}.`);
  }
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
