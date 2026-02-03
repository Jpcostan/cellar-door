import type { Logger } from "../logging/logger.js";
import { readAudit } from "../audit/log.js";

export async function runAuditTail(limit: number, logger: Logger): Promise<void> {
  const records = await readAudit(limit);
  if (records.length === 0) {
    logger.info("Audit log is empty.");
    return;
  }
  for (const record of records) {
    logger.info("Audit", record as unknown as Record<string, unknown>);
  }
}
