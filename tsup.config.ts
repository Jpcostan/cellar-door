import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/memory/retrieval.ts", "src/memory/operations.ts", "src/config/paths.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
