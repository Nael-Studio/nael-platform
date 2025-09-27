export const METADATA_KEYS = {
  injectable: Symbol('nl:injectable'),
  injectParams: Symbol('nl:inject-params'),
  module: Symbol('nl:module'),
  controller: Symbol('nl:controller'),
} as const;

export const GLOBAL_PROVIDERS = {
  config: Symbol('nl:config-service'),
  appOptions: Symbol('nl:application-options'),
};
