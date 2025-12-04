export type VersioningStrategy = 'uri' | 'header' | 'media';

export interface HttpVersioningOptions {
  enabled?: boolean;
  /**
   * Strategy order to resolve version from the request.
   * - `uri`: extracts from a leading path segment like /v1/users (controlled by uriPrefix).
   * - `header`: reads from a header (default x-api-version).
   * - `media`: parses the Accept header parameter (e.g., application/json;v=2).
   */
  strategies?: VersioningStrategy[];
  /**
   * Default version when none is provided by the request.
   */
  defaultVersion?: string;
  /**
   * Header name for the 'header' strategy.
   */
  headerName?: string;
  /**
   * Parameter name in Accept header for the 'media' strategy.
   */
  mediaParameter?: string;
  /**
   * Prefix used in the URI strategy (e.g., "v" for /v1).
   */
  uriPrefix?: string;
  /**
   * Optional response header to expose the negotiated version.
   */
  responseHeader?: string;
}

export const DEFAULT_VERSIONING_OPTIONS: (
  Required<Omit<HttpVersioningOptions, 'defaultVersion' | 'responseHeader'>> &
  Pick<HttpVersioningOptions, 'responseHeader'>
) = {
  enabled: false,
  strategies: ['uri'],
  headerName: 'x-api-version',
  mediaParameter: 'v',
  uriPrefix: 'v',
  responseHeader: undefined,
};
