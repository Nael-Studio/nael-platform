import { describe, expect, it } from 'bun:test';
import { Document, Index } from '@nl-framework/orm';
import { buildModelCatalog } from '../src/introspection/models';

@Document({ collection: 'devtools_widgets', indexes: [{ keys: { category: 1, key: 1 }, options: { unique: true } }] })
@Index({ updatedAt: 1 })
class DevtoolsWidget {}

@Document({ collection: 'devtools_plain', timestamps: false, softDelete: false })
class DevtoolsPlain {}

// Relation-inference fixtures: an order indexed on a foreign key to a customer.
@Document({ collection: 'devtools_customers' })
class DevtoolsCustomer {}

@Document({
  collection: 'devtools_orders',
  indexes: [{ keys: { customerId: 1 } }, { keys: { widgetIds: 1 } }],
})
class DevtoolsOrder {}

describe('buildModelCatalog', () => {
  it('describes registered @Document models with collection, flags, and indexes', () => {
    const catalog = buildModelCatalog();
    const widget = catalog.models.find((m) => m.name === 'DevtoolsWidget');
    const plain = catalog.models.find((m) => m.name === 'DevtoolsPlain');

    expect(widget).toBeDefined();
    expect(widget?.collection).toBe('devtools_widgets');
    expect(widget?.timestamps).toBe(true);
    expect(widget?.softDelete).toBe(true);
    expect(widget?.indexes).toHaveLength(2);
    const keySets = widget?.indexes.map((i) => i.keys);
    expect(keySets).toContainEqual({ category: 1, key: 1 });
    expect(keySets).toContainEqual({ updatedAt: 1 });

    expect(plain?.timestamps).toBe(false);
    expect(plain?.softDelete).toBe(false);
    expect(plain?.indexes).toEqual([]);
  });

  it('reports aggregate stats and sorts by collection', () => {
    const catalog = buildModelCatalog();
    expect(catalog.stats.models).toBe(catalog.models.length);
    expect(catalog.stats.indexes).toBeGreaterThanOrEqual(2);

    const collections = catalog.models.map((m) => m.collection);
    const sorted = [...collections].sort((a, b) => a.localeCompare(b));
    expect(collections).toEqual(sorted);
  });

  it('infers relations from indexed foreign-key fields (one and many)', () => {
    const order = buildModelCatalog().models.find((m) => m.name === 'DevtoolsOrder');
    expect(order?.relations).toEqual(
      expect.arrayContaining([
        { field: 'customerId', target: 'DevtoolsCustomer', cardinality: 'one' },
        { field: 'widgetIds', target: 'DevtoolsWidget', cardinality: 'many' },
      ]),
    );
  });
});
