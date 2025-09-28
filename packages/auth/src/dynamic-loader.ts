import type { Logger } from '@nl-framework/logger';
import type { BetterAuthAdapter } from './interfaces';

interface BetterAuthModuleExports {
  createBetterAuth?: (options?: unknown) => unknown;
  default?: unknown;
}

type BetterAuthFactory = (options?: unknown) => unknown;

const resolveFactory = (mod: BetterAuthModuleExports): BetterAuthFactory | undefined => {
  if (mod.createBetterAuth && typeof mod.createBetterAuth === 'function') {
    return mod.createBetterAuth;
  }

  if (mod.default && typeof mod.default === 'function') {
    return mod.default as BetterAuthFactory;
  }

  if (typeof (mod as unknown as BetterAuthFactory) === 'function') {
    return mod as unknown as BetterAuthFactory;
  }

  return undefined;
};

export const tryCreateBetterAuthInstance = async (
  options: Record<string, unknown> | undefined,
  logger?: Logger,
): Promise<BetterAuthAdapter | undefined> => {
  try {
    const mod = (await import('better-auth')) as BetterAuthModuleExports;
    const factory = resolveFactory(mod);
    if (!factory) {
      logger?.warn('The better-auth package does not expose a recognised factory function; skipping.');
      return undefined;
    }

    const instance = factory(options) as BetterAuthAdapter;
    return instance;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ERR_MODULE_NOT_FOUND') {
      logger?.info('better-auth package not found; using in-memory fallback authentication.');
      return undefined;
    }

    logger?.warn('Failed to initialize better-auth; falling back to in-memory adapter.', {
      message: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
};
