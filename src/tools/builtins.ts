import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Config } from "../config/schema.js";
import type { ToolDefinition } from "../protocol/types.js";
import type { ToolHandler } from "./executor.js";
import { isDomainAllowed, isPathAllowed } from "../policy/engine.js";

const execFileAsync = promisify(execFile);

function resolveWorkspace(config: Config | null): string {
  if (config?.workspaceRoot) {
    return path.resolve(config.workspaceRoot);
  }
  return process.cwd();
}

function ensureWithinWorkspace(targetPath: string, workspaceRoot: string): string {
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(workspaceRoot)) {
    throw new Error("Path is outside workspace scope.");
  }
  return resolved;
}

function ensureDomainAllowed(url: string, config: Config | null): void {
  const host = new URL(url).hostname;
  const policy = isDomainAllowed(host, config);
  if (!policy.allowed) {
    throw new Error(policy.reason);
  }
  const allowed = config?.network?.allowDomains ?? [];
  if (allowed.length === 0 || !allowed.includes(host)) {
    throw new Error("Network domain not allowlisted.");
  }
}

const fsRead: ToolDefinition = {
  name: "fs.read",
  description: "Read a file within the workspace",
  sideEffectClass: "read_only",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      encoding: { type: "string" },
    },
    required: ["path"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      content: { type: "string" },
    },
    required: ["content"],
    additionalProperties: false,
  },
};

const fsWrite: ToolDefinition = {
  name: "fs.write",
  description: "Write a file within the workspace",
  sideEffectClass: "writes_files",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
    required: ["path", "content"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      bytes: { type: "number" },
    },
    required: ["bytes"],
    additionalProperties: false,
  },
};

const netFetch: ToolDefinition = {
  name: "net.fetch",
  description: "Fetch a URL from an allowlisted domain",
  sideEffectClass: "network",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string" },
      method: { type: "string" },
      headers: { type: "object", additionalProperties: { type: "string" } },
      body: { type: "string" },
    },
    required: ["url"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      status: { type: "number" },
      body: { type: "string" },
    },
    required: ["status", "body"],
    additionalProperties: false,
  },
};

const execRun: ToolDefinition = {
  name: "exec.run",
  description: "Execute a command within the workspace",
  sideEffectClass: "exec",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" },
      args: { type: "array", items: { type: "string" } },
      cwd: { type: "string" },
    },
    required: ["command"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" },
      stderr: { type: "string" },
      code: { type: "number" },
    },
    required: ["stdout", "stderr", "code"],
    additionalProperties: false,
  },
};

const gitStatus: ToolDefinition = {
  name: "git.status",
  description: "Run git status --short",
  sideEffectClass: "read_only",
  requiredScopes: [],
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  outputSchema: {
    type: "object",
    properties: { output: { type: "string" } },
    required: ["output"],
    additionalProperties: false,
  },
};

const gitDiff: ToolDefinition = {
  name: "git.diff",
  description: "Run git diff",
  sideEffectClass: "read_only",
  requiredScopes: [],
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  outputSchema: {
    type: "object",
    properties: { output: { type: "string" } },
    required: ["output"],
    additionalProperties: false,
  },
};

const gitLog: ToolDefinition = {
  name: "git.log",
  description: "Run git log -n 20",
  sideEffectClass: "read_only",
  requiredScopes: [],
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  outputSchema: {
    type: "object",
    properties: { output: { type: "string" } },
    required: ["output"],
    additionalProperties: false,
  },
};

const browserOpen: ToolDefinition = {
  name: "browser.open",
  description: "Open a browser and navigate to a URL (requires Playwright)",
  sideEffectClass: "ui_control",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"], additionalProperties: false },
};

const browserNavigate: ToolDefinition = {
  name: "browser.navigate",
  description: "Navigate the active browser page",
  sideEffectClass: "ui_control",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"], additionalProperties: false },
};

const browserClick: ToolDefinition = {
  name: "browser.click",
  description: "Click a selector on the active page",
  sideEffectClass: "ui_control",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { selector: { type: "string" } },
    required: ["selector"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { selector: { type: "string" } }, required: ["selector"], additionalProperties: false },
};

const browserType: ToolDefinition = {
  name: "browser.type",
  description: "Type into a selector on the active page",
  sideEffectClass: "ui_control",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { selector: { type: "string" }, text: { type: "string" } },
    required: ["selector", "text"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { selector: { type: "string" } }, required: ["selector"], additionalProperties: false },
};

const browserScreenshot: ToolDefinition = {
  name: "browser.screenshot",
  description: "Capture a screenshot of the active page",
  sideEffectClass: "screen_capture",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
};

const desktopScreenshot: ToolDefinition = {
  name: "desktop.screenshot",
  description: "Capture a desktop screenshot (foreground only, OS-specific)",
  sideEffectClass: "screen_capture",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
};

const desktopKeypress: ToolDefinition = {
  name: "desktop.keypress",
  description: "Send a keypress to the foreground app",
  sideEffectClass: "ui_control",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { key: { type: "string" } },
    required: ["key"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { key: { type: "string" } }, required: ["key"], additionalProperties: false },
};

const desktopMouse: ToolDefinition = {
  name: "desktop.mouse",
  description: "Move mouse to x/y (foreground only)",
  sideEffectClass: "ui_control",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { x: { type: "number" }, y: { type: "number" } },
    required: ["x", "y"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { x: { type: "number" }, y: { type: "number" } }, required: ["x", "y"], additionalProperties: false },
};

const desktopFocus: ToolDefinition = {
  name: "desktop.focusWindow",
  description: "Focus an app window by name (foreground only)",
  sideEffectClass: "ui_control",
  requiredScopes: [],
  inputSchema: {
    type: "object",
    properties: { app: { type: "string" } },
    required: ["app"],
    additionalProperties: false,
  },
  outputSchema: { type: "object", properties: { app: { type: "string" } }, required: ["app"], additionalProperties: false },
};

export const BUILTIN_TOOLS: ToolDefinition[] = [
  fsRead,
  fsWrite,
  netFetch,
  execRun,
  gitStatus,
  gitDiff,
  gitLog,
  browserOpen,
  browserNavigate,
  browserClick,
  browserType,
  browserScreenshot,
  desktopScreenshot,
  desktopKeypress,
  desktopMouse,
  desktopFocus,
];

class BrowserSession {
  private page: import("playwright").Page | null = null;
  private browser: import("playwright").Browser | null = null;

  async getPage(config: Config | null): Promise<import("playwright").Page> {
    if (this.page) {
      return this.page;
    }
    const { chromium } = await import("playwright");
    const headless = config?.tools?.browserHeadless ?? false;
    this.browser = await chromium.launch({ headless });
    this.page = await this.browser.newPage();
    return this.page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    this.browser = null;
    this.page = null;
  }
}

const browserSession = new BrowserSession();

export const BUILTIN_HANDLERS: Map<string, ToolHandler> = new Map([
  [fsRead.name, {
    definition: fsRead,
    execute: async (args, config) => {
      const workspace = resolveWorkspace(config);
      const target = ensureWithinWorkspace(String(args.path), workspace);
      const pathPolicy = isPathAllowed(target, config);
      if (!pathPolicy.allowed) {
        throw new Error(pathPolicy.reason);
      }
      const encoding = typeof args.encoding === "string" ? args.encoding : "utf-8";
      const content = await fs.readFile(target, encoding as BufferEncoding);
      return { content };
    },
  }],
  [fsWrite.name, {
    definition: fsWrite,
    execute: async (args, config) => {
      const workspace = resolveWorkspace(config);
      const target = ensureWithinWorkspace(String(args.path), workspace);
      const pathPolicy = isPathAllowed(target, config);
      if (!pathPolicy.allowed) {
        throw new Error(pathPolicy.reason);
      }
      const content = String(args.content ?? "");
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await fs.writeFile(target, content, { mode: 0o600 });
      return { bytes: Buffer.byteLength(content) };
    },
  }],
  [netFetch.name, {
    definition: netFetch,
    execute: async (args, config) => {
      const url = String(args.url);
      ensureDomainAllowed(url, config);
      const init: RequestInit = {
        method: typeof args.method === "string" ? args.method : "GET",
        headers: (args.headers ?? {}) as Record<string, string>,
      };
      if (typeof args.body === "string") {
        init.body = args.body;
      }
      const response = await fetch(url, init);
      const body = await response.text();
      return { status: response.status, body };
    },
  }],
  [execRun.name, {
    definition: execRun,
    execute: async (args, config) => {
      const workspace = resolveWorkspace(config);
      const command = String(args.command);
      const cmdArgs = Array.isArray(args.args) ? args.args.map(String) : [];
      const cwd = args.cwd ? ensureWithinWorkspace(String(args.cwd), workspace) : workspace;
      const { stdout, stderr } = await execFileAsync(command, cmdArgs, { cwd });
      return { stdout, stderr, code: 0 };
    },
  }],
  [gitStatus.name, {
    definition: gitStatus,
    execute: async (_args, config) => {
      const workspace = resolveWorkspace(config);
      const { stdout } = await execFileAsync("git", ["status", "--short"], { cwd: workspace });
      return { output: stdout };
    },
  }],
  [gitDiff.name, {
    definition: gitDiff,
    execute: async (_args, config) => {
      const workspace = resolveWorkspace(config);
      const { stdout } = await execFileAsync("git", ["diff"], { cwd: workspace });
      return { output: stdout };
    },
  }],
  [gitLog.name, {
    definition: gitLog,
    execute: async (_args, config) => {
      const workspace = resolveWorkspace(config);
      const { stdout } = await execFileAsync("git", ["log", "-n", "20"], { cwd: workspace });
      return { output: stdout };
    },
  }],
  [browserOpen.name, {
    definition: browserOpen,
    execute: async (args, config) => {
      const page = await browserSession.getPage(config);
      const url = String(args.url);
      await page.goto(url);
      return { url };
    },
  }],
  [browserNavigate.name, {
    definition: browserNavigate,
    execute: async (args, config) => {
      const page = await browserSession.getPage(config);
      const url = String(args.url);
      await page.goto(url);
      return { url };
    },
  }],
  [browserClick.name, {
    definition: browserClick,
    execute: async (args, config) => {
      const page = await browserSession.getPage(config);
      const selector = String(args.selector);
      await page.click(selector);
      return { selector };
    },
  }],
  [browserType.name, {
    definition: browserType,
    execute: async (args, config) => {
      const page = await browserSession.getPage(config);
      const selector = String(args.selector);
      const text = String(args.text);
      await page.fill(selector, text);
      return { selector };
    },
  }],
  [browserScreenshot.name, {
    definition: browserScreenshot,
    execute: async (args, config) => {
      const page = await browserSession.getPage(config);
      const workspace = resolveWorkspace(config);
      const target = ensureWithinWorkspace(String(args.path), workspace);
      await page.screenshot({ path: target });
      return { path: target };
    },
  }],
  [desktopScreenshot.name, {
    definition: desktopScreenshot,
    execute: async (args, config) => {
      const target = ensureWithinWorkspace(String(args.path), resolveWorkspace(config));
      if (process.platform === "darwin") {
        await execFileAsync("screencapture", ["-x", target]);
        return { path: target };
      }
      throw new Error("desktop.screenshot is only implemented on macOS.");
    },
  }],
  [desktopKeypress.name, {
    definition: desktopKeypress,
    execute: async (args) => {
      if (process.platform === "darwin") {
        const key = String(args.key);
        await execFileAsync("osascript", ["-e", `tell application "System Events" to keystroke ${JSON.stringify(key)}`]);
        return { key };
      }
      throw new Error("desktop.keypress is only implemented on macOS.");
    },
  }],
  [desktopMouse.name, {
    definition: desktopMouse,
    execute: async (args) => {
      if (process.platform === "darwin") {
        const x = Number(args.x);
        const y = Number(args.y);
        await execFileAsync("osascript", ["-e", `tell application "System Events" to set position of mouse to {${x}, ${y}}`]);
        return { x, y };
      }
      throw new Error("desktop.mouse is only implemented on macOS.");
    },
  }],
  [desktopFocus.name, {
    definition: desktopFocus,
    execute: async (args) => {
      if (process.platform === "darwin") {
        const app = String(args.app);
        await execFileAsync("osascript", ["-e", `tell application ${JSON.stringify(app)} to activate`]);
        return { app };
      }
      throw new Error("desktop.focusWindow is only implemented on macOS.");
    },
  }],
]);

export function builtinToolRegistry() {
  return BUILTIN_TOOLS;
}
