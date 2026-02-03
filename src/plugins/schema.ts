import { z } from "zod";

export const PluginPermissionSchema = z.object({
  tools: z.array(z.string()).optional(),
  network: z.array(z.string()).optional(),
  ui: z.boolean().optional(),
  secrets: z.boolean().optional(),
});

export const PluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  entry: z.string().min(1),
  permissions: PluginPermissionSchema,
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
