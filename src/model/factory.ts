import { ModelProvider } from "./provider.js";
import { HttpModelProvider } from "./http-provider.js";
import { OllamaModelProvider } from "./ollama-provider.js";
import { LmStudioModelProvider } from "./lmstudio-provider.js";
import { ModelProviderConfig } from "../config/schema.js";

function expandEnv(value: string): string {
  const withBraces = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) => {
    return process.env[name] ?? match;
  });
  return withBraces.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, name: string) => {
    return process.env[name] ?? match;
  });
}

function expandHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const entries = Object.entries(headers).map(([key, value]) => [key, expandEnv(value)]);
  return Object.fromEntries(entries);
}

export function buildModelProvider(config: ModelProviderConfig): ModelProvider {
  if (config.kind === "http") {
    const options = {
      baseUrl: config.baseUrl,
      model: config.model,
      ...(config.headers !== undefined ? { headers: expandHeaders(config.headers) } : {}),
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    };
    return new HttpModelProvider(options);
  }
  if (config.kind === "ollama") {
    const options = {
      model: config.model,
      ...(config.baseUrl !== undefined ? { baseUrl: config.baseUrl } : {}),
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    };
    return new OllamaModelProvider(options);
  }
  if (config.kind === "lmstudio") {
    const options = {
      model: config.model,
      ...(config.baseUrl !== undefined ? { baseUrl: config.baseUrl } : {}),
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    };
    return new LmStudioModelProvider(options);
  }
  throw new Error("Unsupported model provider.");
}
