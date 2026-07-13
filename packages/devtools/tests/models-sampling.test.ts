import { describe, expect, it } from 'bun:test';
import { Document } from '@nl-framework/orm';
import { inferSchemaFromDocument, findModelByName } from '../src/introspection/models';
import { renderDashboardHtml } from '../src/http/dashboard-html';

@Document({ collection: 'devtools_samples' })
class DevtoolsSample {}

class FakeObjectId {
  readonly _bsontype = 'ObjectId';
}

describe('inferSchemaFromDocument', () => {
  it('returns no fields for an empty / missing document', () => {
    expect(inferSchemaFromDocument(null)).toEqual([]);
    expect(inferSchemaFromDocument(undefined)).toEqual([]);
    expect(inferSchemaFromDocument({})).toEqual([]);
  });

  it('infers coarse types per top-level field, sorted by name', () => {
    const fields = inferSchemaFromDocument({
      _id: new FakeObjectId(),
      name: 'ada',
      age: 42,
      active: true,
      createdAt: new Date(),
      tags: ['a', 'b'],
      profile: { bio: 'x' },
      deletedAt: null,
    });

    const byName = Object.fromEntries(fields.map((f) => [f.name, f.type]));
    expect(byName).toEqual({
      _id: 'objectId',
      active: 'boolean',
      age: 'number',
      createdAt: 'date',
      deletedAt: 'null',
      name: 'string',
      profile: 'object',
      tags: 'array',
    });
    // Sorted alphabetically.
    expect(fields.map((f) => f.name)).toEqual([
      '_id',
      'active',
      'age',
      'createdAt',
      'deletedAt',
      'name',
      'profile',
      'tags',
    ]);
  });

  it('never leaks values — only names and types', () => {
    const fields = inferSchemaFromDocument({ secret: 'hunter2' });
    expect(JSON.stringify(fields)).not.toContain('hunter2');
  });
});

describe('findModelByName', () => {
  it('resolves a registered document class by name', () => {
    const model = findModelByName('DevtoolsSample');
    expect(model?.collection).toBe('devtools_samples');
    expect(model?.target).toBe(DevtoolsSample);
    expect(findModelByName('NoSuchModel')).toBeUndefined();
  });
});

describe('dashboard', () => {
  it('wires the model sample/stats endpoints', () => {
    const html = renderDashboardHtml({ basePath: '/__nael', title: 'Nael DevTools' });
    expect(html).toContain('/api/models/');
    expect(html).toContain('function inspectModel');
  });
});
