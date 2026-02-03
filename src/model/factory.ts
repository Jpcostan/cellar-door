import { ModelProvider } from "./provider.js";
import { HttpModelProvider } from "./http-provider.js";
import { OllamaModelProvider } from "./ollama-provider.js";
import { LmStudioModelProvider } from "./lmstudio-provider.js";
import { ModelProviderConfig } from "../config/schema.js";

export function buildModelProvider(config: ModelProviderConfig): ModelProvider {
  if (config.kind === "http") {
    const options = {
      baseUrl: config.baseUrl,
      model: config.model,
      ...(config.headers !== undefined ? { headers: config.headers } : {}),
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
