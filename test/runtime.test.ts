import { describe, it, expect } from "vitest";
import { beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runTask } from "../src/runtime/run.js";
import { InMemoryToolRegistry } from "../src/tools/registry.js";
import { ToolDefinition } from "../src/protocol/types.js";
import type { Logger } from "../src/logging/logger.js";
import type { ModelProvider, ModelRequest, ModelResponse } from "../src/model/provider.js";
import { ENV_HOME } from "../src/config/paths.js";

let tempDir: string | null = null;

async function createTempHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-runtime-"));
}

beforeEach(async () => {
  tempDir = await createTempHome();
  process.env[ENV_HOME] = tempDir;
});

afterEach(async () => {
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
  delete process.env[ENV_HOME];
});

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
    expect(outcome.toolResults[0]?.status).toBe("error");
  });
});
