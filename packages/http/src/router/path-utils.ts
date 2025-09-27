const paramPattern = /:([A-Za-z0-9_]+)/g;

export interface RouteMatcher {
  regex: RegExp;
  paramNames: string[];
}

export const createRouteMatcher = (path: string): RouteMatcher => {
  const paramNames: string[] = [];
  const pattern = path
    .replace(/\//g, '\\/')
    .replace(paramPattern, (_, paramName: string) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
  const regex = new RegExp(`^${pattern}$`);
  return { regex, paramNames };
};

export const extractParams = (
  matcher: RouteMatcher,
  actual: string,
): Record<string, string> | null => {
  const match = matcher.regex.exec(actual);
  if (!match) {
    return null;
  }

  return matcher.paramNames.reduce<Record<string, string>>((acc, name, index) => {
    acc[name] = decodeURIComponent(match[index + 1] ?? '');
    return acc;
  }, {});
};
