import { describe, expect, it } from 'bun:test';
import { Controller } from '@nl-framework/core';
import { Get, type HttpExecutionContext, type RequestContext } from '@nl-framework/http';
import type { GraphqlContext, GraphqlExecutionContext } from '@nl-framework/graphql';
import type { GraphQLResolveInfo } from 'graphql';
import {
  Roles,
  Permissions,
  RolesGuard,
  readAccessRequirement,
  normalizeAuthorizationOptions,
} from '../src/authorization';
import { Public, setRequestAuth } from '../src/index';
import type { AuthorizationOptions, AuthorizationPrincipal } from '../src/authorization';

// --- Fixtures ---------------------------------------------------------------

@Controller('admin')
@Roles('admin')
class AdminController {
  @Get()
  list() {
    return 'ok';
  }

  @Roles('editor')
  @Get('drafts')
  drafts() {
    return 'ok';
  }

  @Permissions('billing:write')
  @Get('billing')
  billing() {
    return 'ok';
  }

  @Get('open-info')
  @Public()
  info() {
    return 'ok';
  }
}

@Controller('free')
class FreeController {
  @Get()
  anything() {
    return 'ok';
  }
}

// --- Execution-context factories -------------------------------------------

const createHttpContext = (
  controller: object,
  handlerName: string,
  principal: AuthorizationPrincipal | null,
): HttpExecutionContext => {
  const context = {} as RequestContext;
  if (principal) {
    setRequestAuth(context, principal);
  }
  return {
    context,
    getRequest: () => new Request('http://localhost/admin', { method: 'GET' }),
    getRoute: () => ({ controller, handlerName, definition: {} }) as never,
    getClass: () => controller as never,
    getHandlerName: () => handlerName,
    getContainer: () => ({ resolve: async () => undefined as never }),
  } as unknown as HttpExecutionContext;
};

const createGraphqlContext = (
  resolverClass: object,
  handlerName: string,
  principal: AuthorizationPrincipal | null,
): GraphqlExecutionContext => {
  const graphqlContext = { req: undefined } as unknown as GraphqlContext;
  if (principal) {
    (graphqlContext as { auth?: AuthorizationPrincipal }).auth = principal;
    (graphqlContext as Record<symbol, unknown>)[
      Symbol.for('@nl-framework/auth/request-state')
    ] = principal;
  }
  const info = { fieldName: handlerName, parentType: { name: 'Query' } } as unknown as GraphQLResolveInfo;
  return {
    details: {
      parent: null,
      args: {},
      context: graphqlContext,
      info,
      resolverClass: resolverClass as never,
      resolverHandlerName: handlerName,
    },
    getContext: () => graphqlContext as never,
    getArgs: () => ({}) as never,
    getInfo: () => info,
    getParent: () => null as never,
    getResolverClass: () => resolverClass as never,
    getResolverHandlerName: () => handlerName,
    resolve: async () => undefined as never,
  } as unknown as GraphqlExecutionContext;
};

const createMicroserviceContext = (
  controllerClass: object,
  handlerName: string,
  metadata?: Record<string, string>,
) => ({
  getPattern: () => 'orders.created',
  getPayload: () => ({}),
  getMetadata: () => metadata,
  getHandler: () => () => undefined,
  getClass: () => controllerClass,
  getHandlerName: () => handlerName,
  getController: () => ({}),
});

const guard = (options: AuthorizationOptions = {}) =>
  new RolesGuard(normalizeAuthorizationOptions(options));

const admin: AuthorizationPrincipal = {
  session: {},
  user: { id: 'u1', role: 'admin' },
} as unknown as AuthorizationPrincipal;
const editor: AuthorizationPrincipal = {
  session: {},
  user: { id: 'u2', role: 'editor' },
} as unknown as AuthorizationPrincipal;

// --- Metadata semantics -----------------------------------------------------

describe('@Roles / @Permissions metadata', () => {
  it('reads class-level roles for an undecorated method', () => {
    expect(readAccessRequirement(AdminController, 'list')).toEqual({
      roles: ['admin'],
      permissions: [],
      isEmpty: false,
    });
  });

  it('method-level @Roles replaces controller-level (no union)', () => {
    const requirement = readAccessRequirement(AdminController, 'drafts');
    expect(requirement.roles).toEqual(['editor']);
    expect(requirement.roles).not.toContain('admin');
  });

  it('applies @Permissions with ALL-of, falling back to class roles', () => {
    const requirement = readAccessRequirement(AdminController, 'billing');
    expect(requirement.roles).toEqual(['admin']);
    expect(requirement.permissions).toEqual(['billing:write']);
  });

  it('reports an empty requirement for unconstrained handlers', () => {
    expect(readAccessRequirement(FreeController, 'anything').isEmpty).toBe(true);
  });
});

// --- HTTP guard -------------------------------------------------------------

describe('RolesGuard (HTTP)', () => {
  it('allows a principal holding an any-of role', async () => {
    expect(await guard().canActivate(createHttpContext(AdminController, 'list', admin))).toBe(true);
  });

  it('denies (403) a principal lacking every required role', async () => {
    const decision = await guard().canActivate(createHttpContext(AdminController, 'list', editor));
    expect(decision).toBeInstanceOf(Response);
    expect((decision as Response).status).toBe(403);
  });

  it('enforces all-of permissions', async () => {
    const withPerm = { user: { role: 'admin', permissions: ['billing:write'] } } as unknown as AuthorizationPrincipal;
    const withoutPerm = { user: { role: 'admin' } } as unknown as AuthorizationPrincipal;
    expect(await guard().canActivate(createHttpContext(AdminController, 'billing', withPerm))).toBe(true);
    expect(await guard().canActivate(createHttpContext(AdminController, 'billing', withoutPerm))).toBeInstanceOf(Response);
  });

  it('bypasses unconstrained routes even without a principal', async () => {
    expect(await guard().canActivate(createHttpContext(FreeController, 'anything', null))).toBe(true);
  });

  it('bypasses @Public routes even when the class declares @Roles', async () => {
    expect(await guard().canActivate(createHttpContext(AdminController, 'info', null))).toBe(true);
  });

  it('throws a configuration-hinting error when the principal is absent on a constrained route', async () => {
    await expect(guard().canActivate(createHttpContext(AdminController, 'list', null))).rejects.toThrow(
      /must run \*after\* AuthGuard/,
    );
  });
});

// --- GraphQL guard ----------------------------------------------------------

describe('RolesGuard (GraphQL)', () => {
  it('allows an any-of role and denies otherwise', async () => {
    expect(await guard().canActivate(createGraphqlContext(AdminController, 'list', admin))).toBe(true);
    const denied = await guard().canActivate(createGraphqlContext(AdminController, 'list', editor));
    expect(denied).toBeInstanceOf(Response);
    expect((denied as Response).status).toBe(403);
  });

  it('throws when the principal is missing on a constrained resolver', async () => {
    await expect(
      guard().canActivate(createGraphqlContext(AdminController, 'list', null)),
    ).rejects.toThrow(/must run \*after\* AuthGuard/);
  });
});

// --- Microservices ----------------------------------------------------------

describe('RolesGuard (microservices)', () => {
  it('allows when the x-principal metadata holds the role', async () => {
    const metadata = { 'x-principal': JSON.stringify({ user: { role: 'admin' } }) };
    const context = createMicroserviceContext(AdminController, 'list', metadata);
    expect(await guard().canActivate(context)).toBe(true);
  });

  it('denies when no principal rides on the message', async () => {
    const context = createMicroserviceContext(AdminController, 'list');
    expect(await guard().canActivate(context)).toBe(false);
  });

  it('bypasses unconstrained message handlers', async () => {
    const context = createMicroserviceContext(FreeController, 'anything');
    expect(await guard().canActivate(context)).toBe(true);
  });
});

// --- Multi-tenant isolation -------------------------------------------------

describe('RolesGuard per-tenant role isolation', () => {
  const options: AuthorizationOptions = {
    // Same user is an admin only within tenant-1.
    rolesResolver: (_session, _user, tenantId) => (tenantId === 'tenant-1' ? ['admin'] : ['viewer']),
  };

  const principalFor = (tenant: string): AuthorizationPrincipal =>
    ({ session: { activeOrganizationId: tenant }, user: { id: 'shared' } }) as unknown as AuthorizationPrincipal;

  it('grants access in the tenant where the role is held', async () => {
    const decision = await guard(options).canActivate(
      createHttpContext(AdminController, 'list', principalFor('tenant-1')),
    );
    expect(decision).toBe(true);
  });

  it('denies access in a tenant where the role is not held', async () => {
    const decision = await guard(options).canActivate(
      createHttpContext(AdminController, 'list', principalFor('tenant-2')),
    );
    expect(decision).toBeInstanceOf(Response);
    expect((decision as Response).status).toBe(403);
  });
});
