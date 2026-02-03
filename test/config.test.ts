import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_CONFIG } from "../src/config/schema.js";
import { loadConfig, writeConfig } from "../src/config/load.js";
import { ENV_HOME } from "../src/config/paths.js";

let tempDir: string | null = null;

async function createTempHome(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-test-"));
  return dir;
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

describe("config loader", () => {
  it("returns null when config is missing", async () => {
    const config = await loadConfig();
    expect(config).toBeNull();
  });

  it("writes and loads config", async () => {
    await writeConfig(DEFAULT_CONFIG);
    const config = await loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });
});
