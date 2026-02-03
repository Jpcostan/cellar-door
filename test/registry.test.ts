import { describe, it, expect } from "vitest";
import { InMemoryToolRegistry } from "../src/tools/registry.js";
import { ToolDefinition } from "../src/protocol/types.js";

const echoTool: ToolDefinition = {
  name: "echo",
  description: "Echo input",
  sideEffectClass: "read_only",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string" },
    },
    required: ["message"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      message: { type: "string" },
    },
    required: ["message"],
    additionalProperties: false,
  },
};

describe("InMemoryToolRegistry", () => {
  it("validates inputs and outputs", () => {
    const registry = new InMemoryToolRegistry([echoTool]);
    expect(registry.validateInput("echo", { message: "hi" })).toBe(true);
    expect(registry.validateInput("echo", { bad: true })).toBe(false);
    expect(registry.validateOutput("echo", { message: "ok" })).toBe(true);
    expect(registry.validateOutput("echo", { message: 123 })).toBe(false);
  });
});
