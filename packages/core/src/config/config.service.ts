import type { PlainObject } from '../utils/deep-merge.js';

const resolvePath = (object: PlainObject, path: string): unknown => {
  const segments = path.split('.');
  let current: unknown = object;

  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    const next = (current as PlainObject)[segment];
    current = next;
  }

  return current;
};

export class ConfigService<TConfig extends PlainObject = PlainObject> {
  constructor(private readonly config: TConfig) {}

  get<TValue = unknown>(path: string, defaultValue?: TValue): TValue {
    const value = resolvePath(this.config, path);
    return (value ?? defaultValue) as TValue;
  }

  has(path: string): boolean {
    return resolvePath(this.config, path) !== undefined;
  }

  all(): TConfig {
    return this.config;
  }
}
