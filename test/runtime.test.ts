import { describe, it, expect } from "vitest";
import { runTask } from "../src/runtime/run.js";
import { InMemoryToolRegistry } from "../src/tools/registry.js";
import { ToolDefinition } from "../src/protocol/types.js";
import type { Logger } from "../src/logging/logger.js";
import type { ModelProvider, ModelRequest, ModelResponse } from "../src/model/provider.js";

class MockProvider implements ModelProvider {
  readonly kind = "mock";
  readonly model = "mock-1";

  capabilities() {
    return { contextWindow: 1000, supportsTools: false, supportsStreaming: false };
  }

  estimateTokens(text: string): number {
    return text.length;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    void request;
    const content = JSON.stringify({
      response: "ok",
      toolCalls: [
        { id: "call-1", name: "echo", arguments: { message: "hi" } },
      ],
    });
    return {
      content,
      toolCalls: [],
      raw: {},
      durationMs: 1,
    };
  }
}

const noopLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

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

describe("runTask", () => {
  it("returns response and denies tool calls by default", async () => {
    const registry = new InMemoryToolRegistry([echoTool]);
    const outcome = await runTask("test", {
      modelProvider: new MockProvider(),
      toolRegistry: registry,
      logger: noopLogger,
    });

    expect(outcome.response).toBe("ok");
    expect(outcome.toolResults).toHaveLength(1);
    expect(outcome.toolResults[0]?.status).toBe("denied");
  });
});
