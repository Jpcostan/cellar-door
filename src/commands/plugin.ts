import type { Logger } from "../logging/logger.js";
import { addPlugin, removePlugin, readPluginIndex, verifyPlugin } from "../plugins/registry.js";
import { createPluginTemplate } from "../plugins/template.js";

export async function runPluginAdd(path: string, logger: Logger): Promise<void> {
  const manifest = await verifyPlugin(path);
  await addPlugin({ name: manifest.name, version: manifest.version, path, manifest });
  logger.info("Plugin added.", { name: manifest.name, path });
}

export async function runPluginRemove(name: string, logger: Logger): Promise<void> {
  await removePlugin(name);
  logger.info("Plugin removed.", { name });
}

export async function runPluginList(logger: Logger): Promise<void> {
  const index = await readPluginIndex();
  if (index.plugins.length === 0) {
    logger.info("No plugins installed.");
    return;
  }
  for (const plugin of index.plugins) {
    logger.info("Plugin", { name: plugin.name, version: plugin.version, path: plugin.path });
  }
}

export async function runPluginVerify(path: string, logger: Logger): Promise<void> {
  const manifest = await verifyPlugin(path);
  logger.info("Plugin verified.", { name: manifest.name, entry: manifest.entry });
}

export async function runPluginTemplate(targetDir: string, name: string, logger: Logger): Promise<void> {
  await createPluginTemplate(targetDir, name);
  logger.info("Plugin template created.", { path: targetDir });
}
