import { describe, expect, it } from 'bun:test';
import { Document, Index, getDocumentMetadata } from '../src/decorators/document';

describe('@Index declarations', () => {
  it('collects indexes from @Document options and repeated @Index decorators', () => {
    @Document({
      collection: 'widgets',
      indexes: [{ keys: { category: 1, key: 1 }, options: { unique: true } }],
    })
    @Index({ updatedAt: 1 })
    @Index({ status: 1, currentStateKey: 1 }, { name: 'status_state' })
    class Widget {}

    const metadata = getDocumentMetadata(Widget);
    expect(metadata.collection).toBe('widgets');
    expect(metadata.indexes).toHaveLength(3);
    expect(metadata.indexes[0]).toEqual({ keys: { category: 1, key: 1 }, options: { unique: true } });
    const indexKeys = metadata.indexes.map((index) => index.keys);
    expect(indexKeys).toContainEqual({ updatedAt: 1 });
    expect(indexKeys).toContainEqual({ status: 1, currentStateKey: 1 });
  });

  it('keeps @Index metadata when @Index is applied below @Document', () => {
    @Index({ email: 1 }, { unique: true })
    @Document({ collection: 'accounts' })
    class Account {}

    const metadata = getDocumentMetadata(Account);
    expect(metadata.collection).toBe('accounts');
    expect(metadata.indexes).toEqual([{ keys: { email: 1 }, options: { unique: true } }]);
  });

  it('defaults to no indexes', () => {
    @Document()
    class Plain {}

    expect(getDocumentMetadata(Plain).indexes).toEqual([]);
  });
});
