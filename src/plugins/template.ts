import fs from "node:fs/promises";
import path from "node:path";

export async function createPluginTemplate(targetDir: string, name: string): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true, mode: 0o700 });
  const manifest = {
    name,
    version: "0.0.1",
    description: "Plugin description",
    entry: "index.js",
    permissions: {
      tools: [],
      network: [],
      ui: false,
      secrets: false,
    },
  };

  await fs.writeFile(path.join(targetDir, "plugin.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  await fs.writeFile(
    path.join(targetDir, "index.js"),
    "export function register() {\n  return {};\n}\n",
    { mode: 0o600 }
  );
}
