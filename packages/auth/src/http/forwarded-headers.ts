import type { NormalizedBetterAuthHttpOptions } from './options';

const FORWARDED_CONTROL_PATTERN = /[\u0000-\u001F\s]/u;
const FORWARDED_INVALID_HOST_PATTERN = /[\/#?]/;

export const sanitizeForwardedProtocol = (
  value: string | undefined,
  allowed: NormalizedBetterAuthHttpOptions['trustedProxy']['protocols'],
): 'http' | 'https' => {
  const fallback = allowed[0] ?? 'http';
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'https' && allowed.includes('https')) {
    return 'https';
  }

  if (normalized === 'http' && allowed.includes('http')) {
    return 'http';
  }

  return fallback;
};

export const sanitizeForwardedHost = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255) {
    return null;
  }

  if (FORWARDED_CONTROL_PATTERN.test(trimmed) || FORWARDED_INVALID_HOST_PATTERN.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(`http://${trimmed}`);
    const host = url.host;
    return host ? host.toLowerCase() : null;
  } catch {
    return null;
  }
};

export const resolveTrustedHost = (
  forwardedHost: string | null,
  fallbackHost: string,
  allowedHosts: NormalizedBetterAuthHttpOptions['trustedProxy']['hosts'],
): string => {
  if (forwardedHost && allowedHosts && allowedHosts.includes(forwardedHost)) {
    return forwardedHost;
  }

  return fallbackHost;
};
