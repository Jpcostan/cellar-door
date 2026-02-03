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
  approvedModelProviders: z.array(z.string()).optional(),
  workspaceRoot: z.string().optional(),
  network: z
    .object({
      allowDomains: z.array(z.string()).optional(),
    })
    .optional(),
  tools: z
    .object({
      execEnabled: z.boolean().optional(),
      browserEnabled: z.boolean().optional(),
      browserHeadless: z.boolean().optional(),
    })
    .optional(),
  policy: z
    .object({
      allowTools: z.array(z.string()).optional(),
      denyTools: z.array(z.string()).optional(),
      allowPaths: z.array(z.string()).optional(),
      denyPaths: z.array(z.string()).optional(),
      allowDomains: z.array(z.string()).optional(),
      denyDomains: z.array(z.string()).optional(),
      allowUi: z.boolean().optional(),
    })
    .optional(),
  tokenBudgets: z
    .object({
      bootstrapMax: z.number().int().positive(),
      hotMax: z.number().int().positive(),
      warmMax: z.number().int().positive(),
    })
    .optional(),
});

export type ModelProviderConfig = z.infer<typeof ModelProviderSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  version: 1,
  modelProvider: null,
  approvedModelProviders: undefined,
  workspaceRoot: undefined,
  network: undefined,
  tools: undefined,
  policy: undefined,
  tokenBudgets: undefined,
};
