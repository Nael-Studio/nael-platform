/**
 * Built-in key substrings whose values are redacted before the resolved config
 * is exposed to the dashboard. Matched case-insensitively as substrings, so
 * `dbPassword`, `JWT_SECRET`, and `apiKey` are all caught. Extend via the
 * `redactKeys` module option.
 */
export const DEFAULT_REDACT_KEYS: readonly string[] = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'accesskey',
  'access_key',
  'privatekey',
  'private_key',
  'credential',
  'connectionstring',
  'connection_string',
  'dsn',
];

const REDACTED = '•••';

export type ConfigLeafType = 'string' | 'number' | 'boolean' | 'null' | 'bigint' | 'object' | 'array';

export type ConfigNode =
  | { key: string; kind: 'branch'; children: ConfigNode[] }
  | { key: string; kind: 'leaf'; type: ConfigLeafType; value: string; redacted: boolean };

export interface ConfigTree {
  nodes: ConfigNode[];
  available: boolean;
  stats: {
    keys: number;
    redacted: number;
  };
}

export interface ConfigTreeOptions {
  /** Extra key substrings to redact, on top of {@link DEFAULT_REDACT_KEYS}. */
  redactKeys?: string[];
}

const leafType = (value: unknown): ConfigLeafType => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') return t;
  return 'object';
};

const stringifyLeaf = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return `${value}n`;
  return String(value as number | boolean);
};

/**
 * Turn a resolved `ConfigService.all()` object into a redacted, serializable
 * tree for the dashboard. Values under keys matching the redaction list — at
 * any depth — are replaced with `•••`, with the original type preserved so the
 * shape stays legible without leaking the secret. Cycles are broken.
 */
export const buildConfigTree = (config: unknown, options: ConfigTreeOptions = {}): ConfigTree => {
  const patterns = [...DEFAULT_REDACT_KEYS, ...(options.redactKeys ?? [])].map((k) => k.toLowerCase());
  const isSecretKey = (key: string): boolean => {
    const lower = key.toLowerCase();
    return patterns.some((pattern) => lower.includes(pattern));
  };

  let keyCount = 0;
  let redactedCount = 0;
  const seen = new WeakSet<object>();

  const build = (key: string, value: unknown, redacted: boolean): ConfigNode => {
    keyCount += 1;
    const redactHere = redacted || isSecretKey(key);

    // Redacted values collapse to a single masked leaf regardless of shape, so
    // no nested secret ever reaches the client.
    if (redactHere) {
      redactedCount += 1;
      return { key, kind: 'leaf', type: leafType(value), value: REDACTED, redacted: true };
    }

    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) {
        return { key, kind: 'leaf', type: 'object', value: '[Circular]', redacted: false };
      }
      seen.add(value);
      const entries = Array.isArray(value)
        ? value.map((item, index) => [String(index), item] as const)
        : Object.entries(value as Record<string, unknown>);
      const children = entries.map(([childKey, childValue]) => build(childKey, childValue, false));
      return { key, kind: 'branch', children };
    }

    if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
      return { key, kind: 'leaf', type: 'object', value: String(value), redacted: false };
    }

    return { key, kind: 'leaf', type: leafType(value), value: stringifyLeaf(value), redacted: false };
  };

  if (config === null || typeof config !== 'object') {
    return { nodes: [], available: false, stats: { keys: 0, redacted: 0 } };
  }

  const root = build('$root', config, false);
  // Discount the synthetic root from the key count.
  keyCount -= 1;
  const nodes = root.kind === 'branch' ? root.children : [];

  return {
    nodes,
    available: true,
    stats: { keys: keyCount, redacted: redactedCount },
  };
};
