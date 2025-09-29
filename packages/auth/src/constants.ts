import type { BetterAuthPlugin } from 'better-auth';
import { mergePluginCollections, resolvePluginKey, resetPluginKeyCounter } from './utils/plugins';

export const BETTER_AUTH_OPTIONS = Symbol.for('@nl-framework/auth/options');
export const BETTER_AUTH_INSTANCE = Symbol.for('@nl-framework/auth/instance');
export const BETTER_AUTH_ADAPTER = Symbol.for('@nl-framework/auth/adapter');

const globalPluginRegistry = new Map<string, BetterAuthPlugin>();

export const registerGlobalPlugins = (plugins: BetterAuthPlugin[]): void => {
  const incoming = mergePluginCollections(plugins);
  for (const plugin of incoming) {
    const key = resolvePluginKey(plugin);
    if (!globalPluginRegistry.has(key)) {
      globalPluginRegistry.set(key, plugin);
    }
  }
};

export const getGlobalPlugins = (): BetterAuthPlugin[] => Array.from(globalPluginRegistry.values());

export const resetGlobalPlugins = (): void => {
  globalPluginRegistry.clear();
  resetPluginKeyCounter();
};
