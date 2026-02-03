/* eslint-disable no-undef */
import { retrieveMemory } from "../dist/memory/retrieval.js";
import { addMemoryCard } from "../dist/memory/operations.js";
import { ENV_HOME } from "../dist/config/paths.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-bench-"));
  process.env[ENV_HOME] = tempDir;

  for (let i = 0; i < 200; i += 1) {
    await addMemoryCard({
      content: `memory ${i} about retrieval benchmarking`,
      tags: ["bench", "memory"],
      scope: "project",
    });
  }

  const start = Date.now();
  const result = await retrieveMemory({
    task: "benchmark retrieval",
    scope: "project",
    budget: { bootstrapMax: 200, hotMax: 200, warmMax: 800 },
    estimateTokens: (text) => Math.ceil(text.length / 4),
  });
  const duration = Date.now() - start;

  console.log(JSON.stringify({
    benchmark: "retrieval",
    durationMs: duration,
    tokensUsed: result.tokensUsed,
    items: result.items.length,
  }));

  await fs.rm(tempDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
