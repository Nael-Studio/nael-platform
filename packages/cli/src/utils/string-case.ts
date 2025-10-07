const splitWords = (value: string): string[] => {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim();

  if (!normalized) {
    return [];
  }

  const parts = normalized.match(/[A-Za-z0-9]+/g);
  if (!parts) {
    return [];
  }

  return parts.map((part) => part.toLowerCase());
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export const toKebabCase = (value: string): string => splitWords(value).join('-');

export const toPascalCase = (value: string): string => {
  const words = splitWords(value);
  if (words.length === 0) {
    return '';
  }

  return words.map((word) => capitalize(word)).join('');
};

export const toCamelCase = (value: string): string => {
  const words = splitWords(value);
  if (words.length === 0) {
    return '';
  }

  const [first, ...rest] = words;
  return [first, ...rest.map((word) => capitalize(word))].join('');
};
