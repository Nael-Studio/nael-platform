import { getCacheStores } from '@nl-framework/core';
import type { HttpRouteRegistrationApi, RequestContext } from '@nl-framework/http';
import type { DevtoolsBus, RequestListFilter } from '../instrumentation/bus';
import type { RequestKind, RequestRecord } from '../instrumentation/events';
import { analyzeCache, analyzeQueries, detectNPlusOne } from '../instrumentation/analysis';

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const parseLimit = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};

const REQUEST_KINDS = new Set<RequestKind>(['http', 'graphql', 'message']);
const REQUEST_STATUSES = new Set<RequestRecord['status']>(['pending', 'ok', 'error']);

/**
 * Mounts the instrumentation API used by the request/ORM/error/log dashboard tabs.
 * All routes sit under the devtools base path and inherit its non-prod guard.
 */
export const mountInstrumentationRoutes = (
  api: HttpRouteRegistrationApi,
  basePath: string,
  bus: DevtoolsBus,
): void => {
  // Request inspector: list + detail (timeline assembled by requestId).
  api.registerRoute('GET', `${basePath}/api/requests`, (ctx: RequestContext) => {
    const query = ctx.query;
    const filter: RequestListFilter = { limit: parseLimit(query.get('limit')) ?? 100 };
    const kind = query.get('kind') as RequestKind | null;
    if (kind && REQUEST_KINDS.has(kind)) filter.kind = kind;
    const status = query.get('status') as RequestRecord['status'] | null;
    if (status && REQUEST_STATUSES.has(status)) filter.status = status;
    return jsonResponse({ requests: bus.listRequests(filter) });
  });

  api.registerRoute('GET', `${basePath}/api/requests/:id`, (ctx: RequestContext) => {
    const id = ctx.params?.id;
    const detail = id ? bus.getRequest(id) : undefined;
    if (!detail) {
      return jsonResponse({ message: 'Request not found' }, 404);
    }
    return jsonResponse({ ...detail, nPlusOne: detectNPlusOne(detail) });
  });

  // ORM query inspector: slowest + per-collection aggregates.
  api.registerRoute('GET', `${basePath}/api/queries`, (ctx: RequestContext) => {
    const limit = parseLimit(ctx.query.get('limit'));
    const queries = bus.listQueries(limit);
    return jsonResponse({ ...analyzeQueries(queries), recent: queries });
  });

  // Error explorer: grouped by name + first stack frame.
  api.registerRoute('GET', `${basePath}/api/exceptions`, (ctx: RequestContext) => {
    const exceptions = bus.listExceptions(parseLimit(ctx.query.get('limit')));
    const groups = new Map<
      string,
      { key: string; name: string; count: number; lastSeen: number; sample: string; requestId?: string }
    >();
    for (const exc of exceptions) {
      const frame = exc.stack?.split('\n')[1]?.trim() ?? '';
      const key = `${exc.name}|${frame}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        if (exc.at > existing.lastSeen) {
          existing.lastSeen = exc.at;
          existing.sample = exc.message;
          existing.requestId = exc.requestId;
        }
      } else {
        groups.set(key, {
          key,
          name: exc.name,
          count: 1,
          lastSeen: exc.at,
          sample: exc.message,
          requestId: exc.requestId,
        });
      }
    }
    const grouped = [...groups.values()].sort((a, b) => b.lastSeen - a.lastSeen);
    return jsonResponse({ groups: grouped, recent: exceptions });
  });

  // Log tail.
  api.registerRoute('GET', `${basePath}/api/logs`, (ctx: RequestContext) => {
    return jsonResponse({ logs: bus.listLogs(parseLimit(ctx.query.get('limit')) ?? 200) });
  });

  // Cache inspector: hit/miss aggregates per store + key prefix, and the list of
  // registered stores (so the UI can offer targeted invalidation).
  api.registerRoute('GET', `${basePath}/api/cache`, (ctx: RequestContext) => {
    const events = bus.listCache(parseLimit(ctx.query.get('limit')));
    return jsonResponse({
      ...analyzeCache(events),
      stores: getCacheStores().map((entry) => entry.name),
      recent: events.slice(0, 100),
    });
  });

  // Invalidate a key across the registered stores (or one named store). Non-prod
  // guard is inherited from the base path; deleting a missing key is a safe no-op.
  api.registerRoute('DELETE', `${basePath}/api/cache/:key`, async (ctx: RequestContext) => {
    const rawKey = ctx.params?.key;
    if (!rawKey) {
      return jsonResponse({ message: 'Missing cache key' }, 400);
    }
    const key = decodeURIComponent(rawKey);
    const storeFilter = ctx.query.get('store');
    const targets = getCacheStores().filter((entry) => !storeFilter || entry.name === storeFilter);
    if (!targets.length) {
      return jsonResponse({ message: 'No matching cache store' }, 404);
    }
    await Promise.all(targets.map((entry) => entry.store.delete(key)));
    return jsonResponse({ deleted: key, stores: targets.map((entry) => entry.name) });
  });
};
