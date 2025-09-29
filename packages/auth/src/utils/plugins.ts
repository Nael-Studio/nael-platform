import type { BetterAuthPlugin } from 'better-auth';

const ANONYMOUS_PLUGIN_PREFIX = 'anonymous-plugin';
let anonymousPluginCounter = 0;

export const resolvePluginKey = (plugin: BetterAuthPlugin): string => {
  if (!plugin || typeof plugin !== 'object') {
    return `${ANONYMOUS_PLUGIN_PREFIX}:${++anonymousPluginCounter}`;
  }

  const candidate = (plugin as { id?: string }).id ?? (plugin as { name?: string }).name;
  if (!candidate || candidate.length === 0) {
    return `${ANONYMOUS_PLUGIN_PREFIX}:${++anonymousPluginCounter}`;
  }

  return candidate;
};

export const mergePluginCollections = (
  ...collections: Array<ReadonlyArray<BetterAuthPlugin> | undefined>
): BetterAuthPlugin[] => {
  const registry = new Map<string, BetterAuthPlugin>();

  for (const collection of collections) {
    if (!collection) {
      continue;
    }

    for (const plugin of collection) {
      if (!plugin) {
        continue;
      }

      const key = resolvePluginKey(plugin);
      if (!registry.has(key)) {
        registry.set(key, plugin);
      }
    }
  }

  return Array.from(registry.values());
};

export const resetPluginKeyCounter = (): void => {
  anonymousPluginCounter = 0;
};
