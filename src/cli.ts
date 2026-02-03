import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runVersion } from "./commands/version.js";
import { createLogger } from "./logging/logger.js";
import { loadConfig } from "./config/load.js";
import { buildModelProvider } from "./model/factory.js";
import { InMemoryToolRegistry } from "./tools/registry.js";
import { runTask } from "./runtime/run.js";

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

program
  .command("run")
  .description("Execute a task using the runtime spine")
  .argument("<task>", "Task to execute")
  .action(async (task: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const config = await loadConfig();
    if (!config || !config.modelProvider) {
      logger.error("No model provider configured. Run `cellar-door init` first.");
      process.exitCode = 1;
      return;
    }
    const provider = buildModelProvider(config.modelProvider);
    const registry = new InMemoryToolRegistry([]);
    const outcome = await runTask(task, { modelProvider: provider, toolRegistry: registry, logger });
    if (program.opts().json) {
      logger.info("Run outcome", { trace: outcome.trace, toolResults: outcome.toolResults });
    } else {
      process.stdout.write(`${outcome.response}\n`);
    }
  });

program.parseAsync(process.argv).catch((error) => {
  const logger = createLogger({ json: program.opts().json as boolean });
  logger.error("Fatal error", { message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
