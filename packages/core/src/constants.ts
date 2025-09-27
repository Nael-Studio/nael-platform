export const METADATA_KEYS = {
  injectable: Symbol.for('nl:injectable'),
  injectParams: Symbol.for('nl:inject-params'),
  module: Symbol.for('nl:module'),
  controller: Symbol.for('nl:controller'),
} as const;

export const GLOBAL_PROVIDERS = {
  config: Symbol.for('nl:config-service'),
  appOptions: Symbol.for('nl:application-options'),
  logger: Symbol.for('nl:logger'),
};
