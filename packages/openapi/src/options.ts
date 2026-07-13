import type { OpenApiConfig } from './interfaces';
import type { BuildOptions } from './document/build-document';

export interface OpenApiModuleOptions extends OpenApiConfig {
  /** Route the JSON document is served from. Default `/openapi.json`. */
  path?: string;
  /** Route the viewer UI is served from, or `false` to disable it. Default `/docs`. */
  ui?: string | false;
  /** URI version prefix applied to routes declaring `@Version()`. Default `'v'`. */
  versionPrefix?: string;
}

export interface NormalizedOpenApiOptions {
  path: string;
  ui: string | false;
  config: BuildOptions;
}

const DEFAULT_PATH = '/openapi.json';
const DEFAULT_UI = '/docs';

const ensureLeadingSlash = (value: string): string =>
  value.startsWith('/') ? value : `/${value}`;

export const normalizeOpenApiOptions = (
  options: OpenApiModuleOptions,
): NormalizedOpenApiOptions => {
  const { path, ui, ...config } = options;
  return {
    path: ensureLeadingSlash(path ?? DEFAULT_PATH),
    ui: ui === false ? false : ensureLeadingSlash(ui ?? DEFAULT_UI),
    config,
  };
};
