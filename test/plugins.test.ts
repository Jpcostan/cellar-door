import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ENV_HOME } from "../src/config/paths.js";
import { addPlugin, readPluginIndex, removePlugin, verifyPlugin } from "../src/plugins/registry.js";

let tempDir: string | null = null;

async function createTempHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-plugin-"));
}

beforeEach(async () => {
  tempDir = await createTempHome();
  process.env[ENV_HOME] = tempDir;
});

afterEach(async () => {
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
  delete process.env[ENV_HOME];
});

describe("plugin registry", () => {
  it("adds and removes plugins", async () => {
    const pluginPath = path.join(tempDir as string, "example");
    await fs.mkdir(pluginPath, { recursive: true });
    await fs.writeFile(path.join(pluginPath, "plugin.json"), JSON.stringify({
      name: "example",
      version: "0.0.1",
      description: "Example",
      entry: "index.js",
      permissions: {}
    }), "utf-8");
    await fs.writeFile(path.join(pluginPath, "index.js"), "", "utf-8");

    const manifest = await verifyPlugin(pluginPath);
    await addPlugin({ name: manifest.name, version: manifest.version, path: pluginPath, manifest });

    let index = await readPluginIndex();
    expect(index.plugins).toHaveLength(1);

    await removePlugin("example");
    index = await readPluginIndex();
    expect(index.plugins).toHaveLength(0);
  });
});
