/**
 * Pluggable provider of ambient fields (e.g. `requestId`) merged into every log
 * entry's `meta`. Kept as a global hook so `@nl-framework/logger` need not depend
 * on `@nl-framework/core` (which owns `RequestContext`) — core registers the
 * provider during bootstrap. Returns `undefined` when no ambient context is active.
 */
export type LoggerContextProvider = () => Record<string, unknown> | undefined;

let contextProvider: LoggerContextProvider | undefined;

/**
 * Registers the ambient-context provider. Pass `undefined` to clear it.
 */
export const setLoggerContextProvider = (provider: LoggerContextProvider | undefined): void => {
  contextProvider = provider;
};

/**
 * Resolves the current ambient context fields, or `undefined`. Never throws — a
 * misbehaving provider is swallowed so logging can never fail.
 */
export const resolveLoggerContext = (): Record<string, unknown> | undefined => {
  if (!contextProvider) {
    return undefined;
  }
  try {
    return contextProvider();
  } catch {
    return undefined;
  }
};
