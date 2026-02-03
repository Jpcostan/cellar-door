import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { DEFAULT_CONFIG, ModelProviderConfig } from "../config/schema.js";
import { ensureHomeDir, loadConfig, writeConfig } from "../config/load.js";
import { getConfigPath } from "../config/paths.js";
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

async function configureModelProvider(logger: Logger): Promise<ModelProviderConfig | null> {
  const wants = await promptYesNo("Configure a model provider now? (y/N) ");
  if (!wants) {
    return null;
  }

  const baseUrl = await promptInput("Base URL (OpenAI-compatible HTTP endpoint): ");
  const model = await promptInput("Model name: ");

  if (!baseUrl || !model) {
    logger.warn("Model provider setup skipped (missing base URL or model).");
    return null;
  }

  logger.info("Provider configured without secrets. Add headers manually if needed.");
  return {
    kind: "http",
    baseUrl,
    model,
  };
}

export async function runInit(logger: Logger): Promise<void> {
  await ensureHomeDir();
  const existing = await loadConfig();
  if (existing) {
    logger.info("Config already exists.", { path: getConfigPath() });
    return;
  }

  let modelProvider: ModelProviderConfig | null = null;
  if (isInteractive()) {
    modelProvider = await configureModelProvider(logger);
  } else {
    logger.info("Non-interactive init: skipping model provider setup.");
  }

  await writeConfig({ ...DEFAULT_CONFIG, modelProvider });
  logger.info("Initialized cellar-door.", { path: getConfigPath() });
}
