import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runVersion } from "./commands/version.js";
import { createLogger } from "./logging/logger.js";

const program = new Command();

program
  .name("cellar-door")
  .description("Local-first automation gateway + memory system")
  .option("--json", "structured JSON logging", false);

program
  .command("init")
  .description("Initialize cellar-door configuration")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runInit(logger);
  });

program
  .command("doctor")
  .description("Verify environment and configuration")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const code = await runDoctor(logger);
    process.exitCode = code;
  });

program
  .command("version")
  .description("Print version")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runVersion(logger);
  });

program.parseAsync(process.argv).catch((error) => {
  const logger = createLogger({ json: program.opts().json as boolean });
  logger.error("Fatal error", { message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
