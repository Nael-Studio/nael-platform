import { describe, expect, it } from 'bun:test';
import { buildConfigTree, DEFAULT_REDACT_KEYS, type ConfigNode } from '../src/introspection/config';
import { renderDashboardHtml } from '../src/http/dashboard-html';

const find = (nodes: ConfigNode[], key: string): ConfigNode | undefined =>
  nodes.find((n) => n.key === key);

const leaf = (node: ConfigNode | undefined): Extract<ConfigNode, { kind: 'leaf' }> => {
  if (!node || node.kind !== 'leaf') throw new Error(`expected a leaf for ${node?.key}`);
  return node;
};

const branch = (node: ConfigNode | undefined): Extract<ConfigNode, { kind: 'branch' }> => {
  if (!node || node.kind !== 'branch') throw new Error(`expected a branch for ${node?.key}`);
  return node;
};

describe('buildConfigTree', () => {
  it('reports unavailable when there is no config object', () => {
    const tree = buildConfigTree(undefined);
    expect(tree.available).toBe(false);
    expect(tree.nodes).toEqual([]);
  });

  it('builds a typed tree preserving nested shape', () => {
    const tree = buildConfigTree({
      port: 3000,
      debug: true,
      database: { host: 'localhost', pool: { min: 1 } },
      tags: ['a', 'b'],
    });

    expect(tree.available).toBe(true);
    expect(leaf(find(tree.nodes, 'port'))).toMatchObject({ type: 'number', value: '3000' });
    expect(leaf(find(tree.nodes, 'debug'))).toMatchObject({ type: 'boolean', value: 'true' });

    const db = branch(find(tree.nodes, 'database'));
    expect(leaf(find(db.children, 'host'))).toMatchObject({ type: 'string', value: 'localhost' });
    const pool = branch(find(db.children, 'pool'));
    expect(leaf(find(pool.children, 'min'))).toMatchObject({ type: 'number', value: '1' });

    // Arrays become branches keyed by index.
    const tags = branch(find(tree.nodes, 'tags'));
    expect(tags.children.map((c) => c.key)).toEqual(['0', '1']);
  });

  it('redacts values whose key matches the built-in patterns, at any depth', () => {
    const tree = buildConfigTree({
      jwtSecret: 'super-secret',
      database: { password: 'pw', host: 'db' },
      nested: { API_KEY: 'k' },
    });

    const secret = leaf(find(tree.nodes, 'jwtSecret'));
    expect(secret.redacted).toBe(true);
    expect(secret.value).toBe('•••');
    // Type is preserved so the shape stays legible.
    expect(secret.type).toBe('string');

    const db = branch(find(tree.nodes, 'database'));
    expect(leaf(find(db.children, 'password')).redacted).toBe(true);
    expect(leaf(find(db.children, 'host')).redacted).toBe(false);

    const nested = branch(find(tree.nodes, 'nested'));
    expect(leaf(find(nested.children, 'API_KEY')).redacted).toBe(true);

    expect(tree.stats.redacted).toBe(3);
  });

  it('collapses a secret-keyed object into a single masked leaf', () => {
    const tree = buildConfigTree({ credentials: { user: 'u', pass: 'p' } });
    const node = leaf(find(tree.nodes, 'credentials'));
    expect(node.redacted).toBe(true);
    expect(node.type).toBe('object');
    expect(node.value).toBe('•••');
  });

  it('honors extra redactKeys and breaks cycles', () => {
    const cyclic: Record<string, unknown> = { name: 'app', licenseKey: 'abc' };
    cyclic.self = cyclic;

    const tree = buildConfigTree(cyclic, { redactKeys: ['licensekey'] });
    expect(leaf(find(tree.nodes, 'licenseKey')).redacted).toBe(true);
    // The self-reference is rendered without infinite recursion.
    expect(leaf(find(tree.nodes, 'self')).value).toBe('[Circular]');
  });

  it('ships a sensible default redaction set', () => {
    expect(DEFAULT_REDACT_KEYS).toContain('password');
    expect(DEFAULT_REDACT_KEYS).toContain('token');
    expect(DEFAULT_REDACT_KEYS).toContain('secret');
    expect(DEFAULT_REDACT_KEYS).toContain('authorization');
  });

  it('renders a Config tab into the dashboard shell', () => {
    const html = renderDashboardHtml({ basePath: '/__nael', title: 'Nael DevTools' });
    expect(html).toContain('data-tab="config"');
    expect(html).toContain('id="tab-config"');
    expect(html).toContain('/api/config');
  });
});
