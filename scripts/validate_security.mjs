import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const checklistPath = path.join(process.cwd(), "docs", "security-checklist.md");
  const content = await fs.readFile(checklistPath, "utf-8");
  const unchecked = content.split("\n").filter((line) => line.startsWith("- [ ]"));
  if (unchecked.length > 0) {
    console.log(JSON.stringify({ status: "incomplete", unchecked: unchecked.length }));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ status: "complete" }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
