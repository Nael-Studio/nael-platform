import { describe, expect, it, afterEach } from 'bun:test';
import {
  describeFilterShape,
  registerQueryObserver,
  clearQueryObservers,
  hasQueryObservers,
  notifyQueryObservers,
  type OrmQueryObservation,
} from '../src/observability/query-observer';

afterEach(() => clearQueryObservers());

describe('describeFilterShape', () => {
  it('preserves keys and operators but redacts every value', () => {
    expect(describeFilterShape({ tenantId: 'secret', name: 'Ada' })).toEqual({
      tenantId: '…',
      name: '…',
    });
    expect(describeFilterShape({ createdAt: { $gt: new Date() }, age: { $in: [1, 2] } })).toEqual({
      createdAt: { $gt: '…' },
      age: { $in: '…' },
    });
  });

  it('is safe on non-objects and bounded in depth', () => {
    expect(describeFilterShape(null)).toEqual({});
    expect(describeFilterShape('nope')).toEqual({});
  });
});

describe('query observer registry', () => {
  it('notifies registered observers and stops after unregister', () => {
    const seen: OrmQueryObservation[] = [];
    expect(hasQueryObservers()).toBe(false);
    const off = registerQueryObserver({ onQuery: (o) => seen.push(o) });
    expect(hasQueryObservers()).toBe(true);

    notifyQueryObservers({ collection: 'users', op: 'find', filterShape: { id: '…' }, durationMs: 2, at: 1 });
    off();
    notifyQueryObservers({ collection: 'users', op: 'find', filterShape: {}, durationMs: 1, at: 2 });

    expect(seen).toHaveLength(1);
    expect(seen[0].collection).toBe('users');
    expect(hasQueryObservers()).toBe(false);
  });

  it('swallows observer errors so a broken observer never breaks a query', () => {
    registerQueryObserver({
      onQuery: () => {
        throw new Error('observer blew up');
      },
    });
    expect(() =>
      notifyQueryObservers({ collection: 'x', op: 'count', filterShape: {}, durationMs: 0, at: 0 }),
    ).not.toThrow();
  });
});
