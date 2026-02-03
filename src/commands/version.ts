import type { Logger } from "../logging/logger.js";
import { readPackageInfo } from "../util/package.js";

export async function runVersion(logger: Logger): Promise<void> {
  const info = await readPackageInfo();
  logger.info(`${info.name} ${info.version}`);
}
