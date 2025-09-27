export type PlainObject = Record<string, unknown>;

const isObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const deepMerge = <T extends PlainObject, U extends PlainObject>(
  target: T,
  source: U,
): T & U => {
  const output: PlainObject = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (isObject(value) && isObject(output[key])) {
      output[key] = deepMerge(output[key] as PlainObject, value);
    } else if (Array.isArray(value) && Array.isArray(output[key])) {
      output[key] = [...(output[key] as unknown[]), ...value];
    } else {
      output[key] = value;
    }
  }

  return output as T & U;
};
