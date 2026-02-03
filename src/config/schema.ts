import { z } from "zod";

export const ModelProviderSchema = z.object({
  kind: z.literal("http"),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  headers: z.record(z.string()).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const ConfigSchema = z.object({
  version: z.literal(1),
  modelProvider: ModelProviderSchema.nullable(),
});

export type ModelProviderConfig = z.infer<typeof ModelProviderSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  version: 1,
  modelProvider: null,
};
