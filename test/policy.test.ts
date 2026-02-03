import { describe, it, expect } from "vitest";
import { isToolAllowed, isPathAllowed, isDomainAllowed, isModelAllowed } from "../src/policy/engine.js";
import type { Config } from "../src/config/schema.js";
import type { ToolDefinition } from "../src/protocol/types.js";

const tool: ToolDefinition = {
  name: "fs.read",
  description: "Read",
  sideEffectClass: "read_only",
  requiredScopes: [],
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  outputSchema: { type: "object", properties: {}, additionalProperties: false },
};

describe("policy engine", () => {
  it("denies non-allowlisted tools when allowTools is set", () => {
    const config: Config = { version: 1, modelProvider: null, policy: { allowTools: ["fs.write"] } };
    const result = isToolAllowed(tool, config);
    expect(result.allowed).toBe(false);
  });

  it("denies paths outside allowlist", () => {
    const config: Config = { version: 1, modelProvider: null, policy: { allowPaths: ["/tmp"] } };
    const result = isPathAllowed("/etc/passwd", config);
    expect(result.allowed).toBe(false);
  });

  it("denies domains in denylist", () => {
    const config: Config = { version: 1, modelProvider: null, policy: { denyDomains: ["example.com"] } };
    const result = isDomainAllowed("example.com", config);
    expect(result.allowed).toBe(false);
  });

  it("restricts model providers when approved list set", () => {
    const config: Config = { version: 1, modelProvider: null, approvedModelProviders: ["http"] };
    const result = isModelAllowed("local", config);
    expect(result.allowed).toBe(false);
  });
});
