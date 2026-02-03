import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runTeamInit, runTeamJoin } from "../src/commands/team.js";
import { createLogger } from "../src/logging/logger.js";

let homeDir: string;
let originalHome: string;

beforeEach(async () => {
  homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-home-"));
  originalHome = process.env.HOME ?? os.homedir();
  process.env.HOME = homeDir;
});

afterEach(async () => {
  await fs.rm(homeDir, { recursive: true, force: true });
  process.env.HOME = originalHome;
});

describe("team commands", () => {
  it("creates team.json and pointer", async () => {
    const shared = await fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-shared-"));
    const logger = createLogger({ json: false });
    await runTeamInit(shared, "demo", logger);
    const teamJson = await fs.readFile(path.join(shared, "team.json"), "utf-8");
    expect(teamJson).toContain("demo");
  });

  it("joins shared root", async () => {
    const shared = await fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-shared-"));
    const logger = createLogger({ json: false });
    await runTeamJoin(shared, logger);
    const pointer = await fs.readFile(path.join(os.homedir(), ".cellar-door", "team-root"), "utf-8");
    expect(pointer.trim()).toBe(shared);
  });
});
