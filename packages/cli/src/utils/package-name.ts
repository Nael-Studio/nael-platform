export const toValidPackageName = (name: string, fallback = 'nael-app'): string => {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9~.-]+/g, '-');

  return normalized.length ? normalized : fallback;
};
