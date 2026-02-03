import { HttpModelProvider } from "./http-provider.js";
import type { ModelProvider, ModelCapabilities, ModelRequest, ModelResponse } from "./provider.js";

export interface LmStudioConfig {
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
}

export class LmStudioModelProvider implements ModelProvider {
  readonly kind = "lmstudio";
  readonly model: string;
  private readonly http: HttpModelProvider;

  constructor(config: LmStudioConfig) {
    const baseUrl = config.baseUrl ?? "http://localhost:1234/v1";
    this.model = config.model;
    this.http = new HttpModelProvider({
      baseUrl,
      model: config.model,
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    });
  }

  capabilities(): ModelCapabilities {
    return this.http.capabilities();
  }

  estimateTokens(text: string): number {
    return this.http.estimateTokens(text);
  }

  generate(request: ModelRequest): Promise<ModelResponse> {
    return this.http.generate(request);
  }
}
