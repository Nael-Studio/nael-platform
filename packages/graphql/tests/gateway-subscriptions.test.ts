import { describe, it, expect } from 'bun:test';
import { isSubscriptionOperation } from '../src/gateway-application';

describe('federation gateway subscription rejection', () => {
  it('detects a subscription operation from a parsed body', () => {
    expect(
      isSubscriptionOperation({ query: 'subscription { messageSent { id } }' }),
    ).toBe(true);
  });

  it('detects a subscription from a raw JSON string body', () => {
    expect(
      isSubscriptionOperation(JSON.stringify({ query: 'subscription { onTick }' })),
    ).toBe(true);
  });

  it('picks the operation named by operationName', () => {
    const query = `
      query A { field }
      subscription B { onTick }
    `;
    expect(isSubscriptionOperation({ query, operationName: 'B' })).toBe(true);
    expect(isSubscriptionOperation({ query, operationName: 'A' })).toBe(false);
  });

  it('does not flag queries or mutations', () => {
    expect(isSubscriptionOperation({ query: 'query { field }' })).toBe(false);
    expect(isSubscriptionOperation({ query: 'mutation { doThing }' })).toBe(false);
  });

  it('is safe on malformed input', () => {
    expect(isSubscriptionOperation({ query: 'not valid graphql {{{' })).toBe(false);
    expect(isSubscriptionOperation(undefined)).toBe(false);
    expect(isSubscriptionOperation('not json')).toBe(false);
  });
});
