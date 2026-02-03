import { z } from "zod";

export const HttpProviderSchema = z.object({
  kind: z.literal("http"),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  headers: z.record(z.string()).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const OllamaProviderSchema = z.object({
  kind: z.literal("ollama"),
  baseUrl: z.string().url().optional(),
  model: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
});

export const LmStudioProviderSchema = z.object({
  kind: z.literal("lmstudio"),
  baseUrl: z.string().url().optional(),
  model: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
});

export const ModelProviderSchema = z.union([HttpProviderSchema, OllamaProviderSchema, LmStudioProviderSchema]);

export const ConfigSchema = z.object({
  version: z.literal(1),
  modelProvider: ModelProviderSchema.nullable(),
  approvedModelProviders: z.array(z.string()).optional(),
  userIdentity: z.string().optional(),
  team: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
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
      desktopEnabled: z.boolean().optional(),
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
      allowDesktop: z.boolean().optional(),
      allowHeadless: z.boolean().optional(),
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
  userIdentity: undefined,
  team: undefined,
  workspaceRoot: undefined,
  network: undefined,
  tools: undefined,
  policy: undefined,
  tokenBudgets: undefined,
};
