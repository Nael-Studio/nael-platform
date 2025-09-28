export const CONFIG_MODULE_OPTIONS = Symbol.for('nl:config:module-options');
export const CONFIG_SOURCE_TOKEN = Symbol.for('nl:config:source');

export const getConfigFeatureToken = (path: string): symbol =>
  Symbol.for(`nl:config:feature:${path}`);
