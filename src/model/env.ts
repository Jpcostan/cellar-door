import { ModelProviderConfig } from "../config/schema.js";

const ENV_REF_REGEX = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;

function extractEnvRefs(value: string): string[] {
  const refs = new Set<string>();
  for (const match of value.matchAll(ENV_REF_REGEX)) {
    const name = match[1] ?? match[2];
    if (name) refs.add(name);
  }
  return Array.from(refs);
}

export function findMissingEnvVarsForProvider(config: ModelProviderConfig): string[] {
  if (config.kind !== "http" || !config.headers) {
    return [];
  }
  const refs = new Set<string>();
  for (const value of Object.values(config.headers)) {
    for (const name of extractEnvRefs(value)) {
      refs.add(name);
    }
  }
  if (refs.size === 0) {
    return [];
  }
  const missing: string[] = [];
  for (const name of refs) {
    if (process.env[name] === undefined || process.env[name] === "") {
      missing.push(name);
    }
  }
  return missing;
}
