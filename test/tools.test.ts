import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { InMemoryToolRegistry } from "../src/tools/registry.js";
import { BUILTIN_TOOLS, BUILTIN_HANDLERS } from "../src/tools/builtins.js";
import { executeToolCall } from "../src/tools/executor.js";
import type { ApprovalProvider } from "../src/tools/approvals.js";
import type { ToolCall } from "../src/protocol/types.js";

class AutoApprove implements ApprovalProvider {
  async requestApproval(): Promise<boolean> {
    return true;
  }
}

class AutoDeny implements ApprovalProvider {
  async requestApproval(): Promise<boolean> {
    return false;
  }
}

let workspace: string;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), "cellar-door-tools-"));
});

afterEach(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

describe("tool execution", () => {
  it("executes read-only fs.read without approval", async () => {
    const filePath = path.join(workspace, "note.txt");
    await fs.writeFile(filePath, "hello", "utf-8");

    const registry = new InMemoryToolRegistry(BUILTIN_TOOLS);
    const call: ToolCall = { id: "1", name: "fs.read", arguments: { path: filePath } };
    const result = await executeToolCall(call, {
      config: { version: 1, modelProvider: null, workspaceRoot: workspace },
      registry,
      approve: new AutoDeny(),
      handlers: BUILTIN_HANDLERS,
    });

    expect(result.status).toBe("success");
  });

  it("denies network calls without allowlist", async () => {
    const registry = new InMemoryToolRegistry(BUILTIN_TOOLS);
    const call: ToolCall = { id: "2", name: "net.fetch", arguments: { url: "https://example.com" } };
    const result = await executeToolCall(call, {
      config: { version: 1, modelProvider: null, workspaceRoot: workspace },
      registry,
      approve: new AutoApprove(),
      handlers: BUILTIN_HANDLERS,
    });

    expect(result.status).toBe("error");
  });

  it("requires approval for writes", async () => {
    const registry = new InMemoryToolRegistry(BUILTIN_TOOLS);
    const call: ToolCall = { id: "3", name: "fs.write", arguments: { path: path.join(workspace, "x.txt"), content: "hi" } };
    const result = await executeToolCall(call, {
      config: { version: 1, modelProvider: null, workspaceRoot: workspace },
      registry,
      approve: new AutoDeny(),
      handlers: BUILTIN_HANDLERS,
    });

    expect(result.status).toBe("denied");
  });
});
