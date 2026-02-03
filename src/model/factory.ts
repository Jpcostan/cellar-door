import { ModelProvider } from "./provider.js";
import { HttpModelProvider } from "./http-provider.js";
import { ModelProviderConfig } from "../config/schema.js";

export function buildModelProvider(config: ModelProviderConfig): ModelProvider {
  if (config.kind !== "http") {
    throw new Error(`Unsupported model provider: ${config.kind}`);
  }

  const options = {
    baseUrl: config.baseUrl,
    model: config.model,
    ...(config.headers !== undefined ? { headers: config.headers } : {}),
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
  };

  return new HttpModelProvider(options);
}
