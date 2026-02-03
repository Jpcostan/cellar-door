import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runVersion } from "./commands/version.js";
import { createLogger } from "./logging/logger.js";
import { loadConfig } from "./config/load.js";
import { buildModelProvider } from "./model/factory.js";
import { InMemoryToolRegistry } from "./tools/registry.js";
import { runTask } from "./runtime/run.js";
import { runMemoryAdd, runMemoryCompact, runMemoryGc, runMemorySearch } from "./commands/memory.js";
import { BUILTIN_TOOLS } from "./tools/builtins.js";
import { runToolDescribe, runToolList } from "./commands/tool.js";
import { runPolicyCheck, runPolicyExplain, runPolicyApprove, runPolicyCheckDomain, runPolicyCheckPath, runPolicyCheckUi, runPolicyCheckModel } from "./commands/policy.js";
import { runAuditTail } from "./commands/audit.js";
import { runPluginAdd, runPluginList, runPluginRemove, runPluginTemplate, runPluginVerify } from "./commands/plugin.js";
import { runTeamInit, runTeamJoin, runTeamSync } from "./commands/team.js";

const program = new Command();

program
  .name("cellar-door")
  .description("Local-first automation gateway + memory system")
  .option("--json", "structured JSON logging", false);

program
  .command("init")
  .description("Initialize or reconfigure cellar-door configuration (alias: setup)")
  .option("-f, --force", "Recreate config and re-run setup prompts", false)
  .action(async (options: { force?: boolean }) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const initOptions = options.force === undefined ? undefined : { force: options.force };
    await runInit(logger, initOptions);
  });

program
  .command("setup")
  .description("Set up model provider and config (recommended)")
  .option("-f, --force", "Recreate config and re-run setup prompts", false)
  .action(async (options: { force?: boolean }) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const initOptions = options.force === undefined ? undefined : { force: options.force };
    await runInit(logger, initOptions);
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
    const registry = new InMemoryToolRegistry(BUILTIN_TOOLS);
    const runOptions = {
      modelProvider: provider,
      toolRegistry: registry,
      logger,
      ...(config.tokenBudgets ? { tokenBudgets: config.tokenBudgets } : {}),
      config,
    };
    const outcome = await runTask(task, runOptions);
    if (program.opts().json) {
      logger.info("Run outcome", { trace: outcome.trace, toolResults: outcome.toolResults });
    } else {
      process.stdout.write(`${outcome.response}\n`);
    }
  });

const memory = program.command("memory").description("Manage memory cards and summaries");

memory
  .command("add")
  .description("Add a memory card")
  .argument("<content>", "Memory content")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--scope <scope>", "Scope (org|team|project|user)", "project")
  .option("--type <type>", "Type (fact|lesson|decision|snippet)", "fact")
  .option("--importance <importance>", "Importance 0..1", (value) => Number.parseFloat(value), 0.5)
  .action(async (content: string, options: { tags?: string; scope: string; type: string; importance: number }) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const addOptions: { tags?: string; scope?: "org" | "team" | "project" | "user"; type?: "fact" | "lesson" | "decision" | "snippet"; importance?: number } = {};
    if (options.tags) addOptions.tags = options.tags;
    if (options.scope) addOptions.scope = options.scope as "org" | "team" | "project" | "user";
    if (options.type) addOptions.type = options.type as "fact" | "lesson" | "decision" | "snippet";
    if (Number.isFinite(options.importance)) addOptions.importance = options.importance;
    await runMemoryAdd(content, addOptions, logger);
  });

memory
  .command("search")
  .description("Search memory cards")
  .argument("<query>", "Query text")
  .option("--scope <scope>", "Scope (org|team|project|user)")
  .option("--limit <limit>", "Max results", (value) => Number.parseInt(value, 10), 5)
  .action(async (query: string, options: { scope?: string; limit: number }) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const searchOptions: { scope?: "org" | "team" | "project" | "user"; limit?: number } = {};
    if (options.scope) searchOptions.scope = options.scope as "org" | "team" | "project" | "user";
    if (Number.isFinite(options.limit)) searchOptions.limit = options.limit;
    await runMemorySearch(query, searchOptions, logger);
  });

memory
  .command("compact")
  .description("Compact memory into hot summary")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runMemoryCompact(logger);
  });

memory
  .command("gc")
  .description("Garbage collect memory index")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runMemoryGc(logger);
  });

const tool = program.command("tool").description("Inspect available tools");

tool
  .command("list")
  .description("List tools")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const registry = new InMemoryToolRegistry(BUILTIN_TOOLS);
    await runToolList(registry, logger);
  });

tool
  .command("describe")
  .description("Describe a tool")
  .argument("<name>", "Tool name")
  .action(async (name: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const registry = new InMemoryToolRegistry(BUILTIN_TOOLS);
    await runToolDescribe(name, registry, logger);
  });

const policy = program.command("policy").description("Evaluate policy rules");

policy
  .command("check")
  .description("Check if a tool is allowed by policy")
  .argument("<name>", "Tool name")
  .action(async (name: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const config = await loadConfig();
    const registry = new InMemoryToolRegistry(BUILTIN_TOOLS);
    const toolDef = registry.get(name);
    if (!toolDef) {
      logger.error("Tool not found.", { name });
      process.exitCode = 1;
      return;
    }
    await runPolicyCheck(toolDef, config, logger);
  });

policy
  .command("explain")
  .description("Show current policy configuration")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const config = await loadConfig();
    await runPolicyExplain(config, logger);
  });

policy
  .command("approve")
  .description("Record a manual approval (time-bounded)")
  .argument("<name>", "Tool name")
  .option("--ttl <seconds>", "Approval TTL in seconds", (value) => Number.parseInt(value, 10), 300)
  .action(async (name: string, options: { ttl: number }) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runPolicyApprove(name, options.ttl, logger);
  });

policy
  .command("check-path")
  .description("Check a filesystem path against policy")
  .argument("<path>", "Path to check")
  .action(async (value: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const config = await loadConfig();
    await runPolicyCheckPath(value, config, logger);
  });

policy
  .command("check-domain")
  .description("Check a network domain against policy")
  .argument("<domain>", "Domain to check")
  .action(async (value: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const config = await loadConfig();
    await runPolicyCheckDomain(value, config, logger);
  });

policy
  .command("check-ui")
  .description("Check UI control policy")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const config = await loadConfig();
    await runPolicyCheckUi(config, logger);
  });

policy
  .command("check-model")
  .description("Check model provider against policy")
  .argument("<provider>", "Provider kind (e.g., http)")
  .action(async (value: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    const config = await loadConfig();
    await runPolicyCheckModel(value, config, logger);
  });

const audit = program.command("audit").description("Audit log viewer");

audit
  .command("tail")
  .description("Show recent audit events")
  .option("--limit <limit>", "Number of entries", (value) => Number.parseInt(value, 10), 50)
  .action(async (options: { limit: number }) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runAuditTail(options.limit, logger);
  });

const plugin = program.command("plugin").description("Manage plugins");

plugin
  .command("add")
  .description("Add a plugin from a local path")
  .argument("<path>", "Path to plugin")
  .action(async (value: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runPluginAdd(value, logger);
  });

plugin
  .command("remove")
  .description("Remove a plugin by name")
  .argument("<name>", "Plugin name")
  .action(async (value: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runPluginRemove(value, logger);
  });

plugin
  .command("list")
  .description("List installed plugins")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runPluginList(logger);
  });

plugin
  .command("verify")
  .description("Verify a plugin manifest and entry file")
  .argument("<path>", "Path to plugin")
  .action(async (value: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runPluginVerify(value, logger);
  });

plugin
  .command("template")
  .description("Create a plugin template")
  .argument("<path>", "Target directory")
  .argument("<name>", "Plugin name")
  .action(async (dir: string, name: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runPluginTemplate(dir, name, logger);
  });

const team = program.command("team").description("Team mode commands");

team
  .command("init")
  .description("Initialize a shared team directory")
  .argument("<path>", "Shared directory path")
  .argument("<name>", "Team name")
  .action(async (dir: string, name: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runTeamInit(dir, name, logger);
  });

team
  .command("join")
  .description("Join a team shared directory")
  .argument("<path>", "Shared directory path")
  .action(async (dir: string) => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runTeamJoin(dir, logger);
  });

team
  .command("sync")
  .description("Sync with shared team directory")
  .action(async () => {
    const logger = createLogger({ json: program.opts().json as boolean });
    await runTeamSync(logger);
  });

program.parseAsync(process.argv).catch((error) => {
  const logger = createLogger({ json: program.opts().json as boolean });
  logger.error("Fatal error", { message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
