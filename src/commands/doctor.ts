import process from "node:process";
import { ConfigError, loadConfig } from "../config/load.js";
import { getConfigPath, getHomeDir } from "../config/paths.js";
import type { Logger } from "../logging/logger.js";

function formatNodeVersion(): string {
  return process.version;
}

export async function runDoctor(logger: Logger): Promise<number> {
  logger.info("cellar-door doctor");
  logger.info("Node.js version", { version: formatNodeVersion() });
  logger.info("Home directory", { path: getHomeDir() });

  try {
    const config = await loadConfig();
    if (!config) {
      logger.warn("Config not found.", { path: getConfigPath() });
      return 1;
    }
    logger.info("Config loaded.", { path: getConfigPath() });
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
