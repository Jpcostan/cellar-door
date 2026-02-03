import fs from "node:fs/promises";

export interface PackageInfo {
  name: string;
  version: string;
}

export async function readPackageInfo(): Promise<PackageInfo> {
  const url = new URL("../package.json", import.meta.url);
  const raw = await fs.readFile(url, "utf-8");
  const parsed = JSON.parse(raw) as PackageInfo;
  return { name: parsed.name, version: parsed.version };
}
