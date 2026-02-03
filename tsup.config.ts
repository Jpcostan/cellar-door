import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/cli.ts",
    "src/memory/retrieval.ts",
    "src/memory/operations.ts",
    "src/config/paths.ts",
    "src/tools/executor.ts",
    "src/tools/builtins.ts",
    "src/tools/approvals.ts",
    "src/tools/policy.ts",
    "src/tools/registry.ts",
    "src/policy/engine.ts",
    "src/policy/approvals.ts",
    "src/audit/log.ts"
  ],
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
