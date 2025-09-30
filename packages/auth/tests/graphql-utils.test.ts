import { describe, expect, it } from 'bun:test';
import type { GraphqlContext } from '@nl-framework/graphql';
import { normalizeBetterAuthHttpOptions } from '../src/http/options';
import { createBetterAuthRequest, forwardBetterAuthHeaders } from '../src/graphql/utils';

const createContext = (overrides: Partial<GraphqlContext> = {}): GraphqlContext => {
  const request = new Request('http://127.0.0.1:4201/graphql', {
    headers: {
      cookie: 'better-auth.session_token=abc',
      authorization: 'Bearer token',
      'user-agent': 'bun-test',
      'x-forwarded-proto': 'http',
      'x-forwarded-for': '127.0.0.1',
    },
  });

  const context: GraphqlContext = {
    req: { headers: {} } as any,
    res: {
      setHeader: () => undefined,
    } as any,
    request,
    ...overrides,
  };

  return context;
};

describe('GraphQL Better Auth utilities', () => {
  it('builds requests using the Better Auth prefix and forwards relevant headers', () => {
    const context = createContext();
    const httpOptions = normalizeBetterAuthHttpOptions({ prefix: '/api/auth' });

    const request = createBetterAuthRequest({
      context,
      httpOptions,
      path: '/sign-in/email',
      method: 'POST',
      body: { email: 'demo@example.com', password: 'secret' },
    });

    expect(request.url).toBe('http://127.0.0.1:4201/api/auth/sign-in/email');
    expect(request.method).toBe('POST');
    expect(request.headers.get('cookie')).toContain('better-auth.session_token');
    expect(request.headers.get('authorization')).toBe('Bearer token');
    expect(request.headers.get('content-type')).toBe('application/json');
  });

  it('forwards Set-Cookie headers back to the GraphQL response', () => {
    let captured: string | string[] | undefined;
    const context = createContext({
      res: {
        setHeader: (_name: string, value: string | string[]) => {
          captured = value;
        },
      },
    } as GraphqlContext);

    const response = new Response('ok', {
      headers: {
        'Set-Cookie': 'better-auth.session_token=def; Path=/; HttpOnly',
      },
    });

    forwardBetterAuthHeaders(context, response);
    expect(captured).toBe('better-auth.session_token=def; Path=/; HttpOnly');
  });
});
