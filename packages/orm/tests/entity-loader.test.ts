import { describe, expect, it } from 'bun:test';
import { ObjectId } from 'mongodb';
import { createEntityLoader } from '../src/graphql/entity-loader';

interface Doc {
  id: string;
  _id: ObjectId;
  name: string;
}

describe('createEntityLoader', () => {
  it('coalesces concurrent loads into a single batched query', async () => {
    const a = new ObjectId();
    const b = new ObjectId();
    const store: Doc[] = [
      { id: a.toHexString(), _id: a, name: 'A' },
      { id: b.toHexString(), _id: b, name: 'B' },
    ];
    let findCalls = 0;

    const loader = createEntityLoader<Doc>({
      find: async (filter: any) => {
        findCalls += 1;
        const keys: string[] = filter.$or?.[0]?.id?.$in ?? [];
        return store.filter((d) => keys.includes(d.id));
      },
    });

    const [ra, rb, raAgain] = await Promise.all([
      loader.load(a),
      loader.load(b.toHexString()),
      loader.load(a),
    ]);

    expect(ra?.name).toBe('A');
    expect(rb?.name).toBe('B');
    expect(raAgain?.name).toBe('A');
    expect(findCalls).toBe(1); // batched + deduped
  });

  it('returns null for unknown ids', async () => {
    const loader = createEntityLoader<Doc>({ find: async () => [] });
    expect(await loader.load(new ObjectId())).toBeNull();
  });
});
