import process from "node:process";
import { ConfigError, loadConfig } from "../config/load.js";
import { getConfigPath, getHomeDir } from "../config/paths.js";
import type { Logger } from "../logging/logger.js";
import { findMissingEnvVarsForProvider } from "../model/env.js";

function formatNodeVersion(): string {
  return process.version;
}

function getNodeMajor(): number | null {
  const match = process.version.match(/^v(\d+)\./);
  if (!match) return null;
  return Number.parseInt(match[1] ?? "", 10);
}

export async function runDoctor(logger: Logger): Promise<number> {
  logger.info("cellar-door doctor");
  logger.info("Node.js version", { version: formatNodeVersion() });
  logger.info("Home directory", { path: getHomeDir() });

  const major = getNodeMajor();
  if (major !== null && major < 22) {
    logger.error("Node.js >= 22 is required.", { version: formatNodeVersion() });
    return 1;
  }

  try {
    const config = await loadConfig();
    if (!config) {
      logger.warn("Config not found.", { path: getConfigPath() });
      return 1;
    }
    logger.info("Config loaded.", { path: getConfigPath() });
    if (config.modelProvider) {
      const missing = findMissingEnvVarsForProvider(config.modelProvider);
      if (missing.length > 0) {
        logger.error("Missing required env vars for model provider.", {
          missing,
          envFile: `${getHomeDir()}/.env`,
        });
        return 1;
      }
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error(error.message, { path: getConfigPath() });
      return 1;
    }
    logger.error("Unexpected error reading config.");
    return 1;
  }

  logger.info("Doctor check complete.");
  return 0;
}
