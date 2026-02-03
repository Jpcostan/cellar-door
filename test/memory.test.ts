import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ENV_HOME, getBootstrapDir } from "../src/config/paths.js";
import { addMemoryCard, compactHotSummary, compactSessionsToCard } from "../src/memory/operations.js";
import { appendSessionLog } from "../src/memory/sessions.js";
import { retrieveMemory } from "../src/memory/retrieval.js";
import { readHotSummary } from "../src/memory/store.js";

let tempDir: string | null = null;

async function createTempHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-mem-"));
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

describe("memory retrieval", () => {
  it("retrieves bootstrap, hot, and warm memory under budget", async () => {
    const bootstrapDir = getBootstrapDir();
    await fs.mkdir(bootstrapDir, { recursive: true });
    await fs.writeFile(path.join(bootstrapDir, "identity.md"), "bootstrap", "utf-8");

    await addMemoryCard({ content: "first memory", tags: ["first"], scope: "project" });
    await addMemoryCard({ content: "second memory", tags: ["second"], scope: "project" });

    const summary = await compactHotSummary({ maxTokens: 50, estimateTokens: (text) => Math.ceil(text.length / 4) });
    expect(summary.length).toBeGreaterThan(0);

    const retrieved = await retrieveMemory({
      task: "first",
      scope: "project",
      budget: { bootstrapMax: 20, hotMax: 20, warmMax: 50 },
      estimateTokens: (text) => Math.ceil(text.length / 4),
    });

    expect(retrieved.items.join("\n")).toContain("bootstrap");
    expect(retrieved.items.join("\n")).toContain("Hot Summary");
    expect(retrieved.items.join("\n")).toContain("Memory");
  });
});

describe("memory compaction", () => {
  it("writes hot summary", async () => {
    await addMemoryCard({ content: "compact me", tags: ["compact"], scope: "project" });
    await compactHotSummary({ maxTokens: 100, estimateTokens: (text) => Math.ceil(text.length / 4) });
    const hot = await readHotSummary();
    expect(hot).toContain("compact me");
  });

  it("compacts sessions into a memory card", async () => {
    await appendSessionLog("session entry");
    const card = await compactSessionsToCard();
    expect(card?.id).toBeTruthy();
  });
});
