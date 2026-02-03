import { ENV_HOME } from "../dist/config/paths.js";
import { addMemoryCard, searchMemory } from "../dist/memory/operations.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-bench-"));
  process.env[ENV_HOME] = tempDir;

  const cards = [];
  for (let i = 0; i < 200; i += 1) {
    const content = `memory ${i} about system design and retrieval efficiency`;
    await addMemoryCard({ content, tags: ["bench", "token"], scope: "project" });
    cards.push(content);
  }

  const loadEverythingTokens = estimateTokens(cards.join("\n"));
  const results = await searchMemory({ query: "system design", scope: "project", limit: 10 });
  const retrievedTokens = estimateTokens(results.map((r) => r.excerpt).join("\n"));

  console.log(JSON.stringify({
    benchmark: "tokens",
    loadEverythingTokens,
    retrievedTokens,
    savings: loadEverythingTokens - retrievedTokens,
  }));

  await fs.rm(tempDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
