import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import type { BaseDocument, DocumentClass } from '../src/interfaces/document';
import { Document, getDocumentMetadata } from '../src/decorators/document';
import { Prop } from '../src/decorators/prop';
import { Ref, RefArray, Embedded, type Ref as RefType } from '../src/decorators/relations';
import { MongoRepository, type RelationResolver } from '../src/repository/mongo-repository';

@Document({ collection: 'r_users' })
class RUser {
  @Prop() name!: string;
}

@Document({ collection: 'r_tags' })
class RTag {
  @Prop() label!: string;
}

@Document({ collection: 'r_addresses' })
class Address {
  @Prop() city!: string;
  describe(): string {
    return `city:${this.city}`;
  }
}

@Document({ collection: 'r_posts' })
class Post {
  @Prop() title!: string;
  @Ref(() => RUser) authorId!: RefType<RUser>;
  @RefArray(() => RTag) tagIds!: Array<RefType<RTag>>;
  @Embedded(() => Address) address?: Address;
}

const oidHex = (v: unknown): string | null =>
  v instanceof ObjectId ? v.toHexString() : typeof v === 'string' ? v : null;

const matchIn = (arr: unknown[], val: unknown): boolean =>
  arr.some((a) => {
    const ah = oidHex(a);
    const vh = oidHex(val);
    return ah !== null && vh !== null ? ah === vh : a === val;
  });

const match = (filter: Record<string, any>, doc: Record<string, any>): boolean => {
  if (!filter || Object.keys(filter).length === 0) return true;
  if (filter.$and) return filter.$and.every((f: any) => match(f, doc));
  if (filter.$or) return filter.$or.some((f: any) => match(f, doc));
  for (const [k, c] of Object.entries(filter)) {
    const dv = doc[k];
    if (c && typeof c === 'object' && !(c instanceof ObjectId)) {
      if ('$in' in c) {
        if (!matchIn((c as any).$in, dv)) return false;
        continue;
      }
      if ('$exists' in c) {
        const ok = (c as any).$exists ? dv !== undefined : dv === undefined;
        if (!ok) return false;
        continue;
      }
    }
    if (k === '_id' || k === 'id') {
      if (oidHex(c) !== oidHex(dv)) return false;
      continue;
    }
    if (dv !== c) return false;
  }
  return true;
};

const createColl = (docs: Record<string, any>[]) => {
  let findCalls = 0;
  const col = {
    find: (filter: Record<string, any>) => {
      findCalls += 1;
      const rows = docs.filter((d) => match(filter, d));
      return { toArray: async () => rows.map((r) => ({ ...r })) };
    },
  } as unknown as Collection<BaseDocument>;
  return { col, calls: () => findCalls };
};

const withIds = <T extends Record<string, any>>(rows: T[]): Array<T & { _id: ObjectId; id: string; deletedAt: null }> =>
  rows.map((r) => {
    const _id = r._id ?? new ObjectId();
    return { ...r, _id, id: _id.toHexString(), deletedAt: null };
  });

describe('relations & population', () => {
  it('populates a single @Ref and @RefArray with one query each (no N+1)', async () => {
    const users = withIds([{ name: 'Ada' }, { name: 'Grace' }]);
    const tags = withIds([{ label: 'ts' }, { label: 'db' }]);
    const posts = withIds([
      { title: 'P1', authorId: users[0]!._id, tagIds: [tags[0]!._id, tags[1]!._id] },
      { title: 'P2', authorId: users[1]!._id, tagIds: [tags[0]!._id] },
    ]);

    const usersColl = createColl(users);
    const tagsColl = createColl(tags);
    const postsColl = createColl(posts);

    const resolveRelation: RelationResolver = async (target: DocumentClass) => {
      if (target === RUser) return { collection: usersColl.col, metadata: getDocumentMetadata(RUser) };
      if (target === RTag) return { collection: tagsColl.col, metadata: getDocumentMetadata(RTag) };
      return null;
    };

    const repo = new MongoRepository<Post>(postsColl.col as never, getDocumentMetadata(Post), undefined, {
      resolveRelation,
    });

    const result = await repo.find({}, { populate: ['authorId', 'tagIds'] });

    expect(result).toHaveLength(2);
    expect((result[0]!.authorId as unknown as RUser)).toBeInstanceOf(RUser);
    expect((result[0]!.authorId as unknown as RUser).name).toBe('Ada');
    expect((result[0]!.tagIds as unknown as RTag[]).map((t) => t.label)).toEqual(['ts', 'db']);

    // Exactly one batched query per relation, regardless of the number of posts.
    expect(usersColl.calls()).toBe(1);
    expect(tagsColl.calls()).toBe(1);
  });

  it('sets a missing @Ref target to null and warns', async () => {
    const users = withIds([{ name: 'Ada' }]);
    const missingId = new ObjectId();
    const posts = withIds([{ title: 'Orphan', authorId: missingId, tagIds: [] }]);

    const usersColl = createColl(users);
    const postsColl = createColl(posts);
    const warnings: string[] = [];

    const resolveRelation: RelationResolver = async (target: DocumentClass) =>
      target === RUser ? { collection: usersColl.col, metadata: getDocumentMetadata(RUser) } : null;

    const repo = new MongoRepository<Post>(postsColl.col as never, getDocumentMetadata(Post), undefined, {
      resolveRelation,
      logger: { warn: (m) => warnings.push(m) },
    });

    const [post] = await repo.find({}, { populate: ['authorId'] });
    expect(post!.authorId).toBeNull();
    expect(warnings.some((w) => w.includes(missingId.toHexString()))).toBe(true);
  });

  it('hydrates @Embedded subdocuments into class instances on read (no populate needed)', async () => {
    const posts = withIds([{ title: 'P', authorId: new ObjectId(), tagIds: [], address: { city: 'KL' } }]);
    const postsColl = createColl(posts);
    const repo = new MongoRepository<Post>(postsColl.col as never, getDocumentMetadata(Post));

    const [post] = await repo.find({});
    expect(post!.address).toBeInstanceOf(Address);
    expect((post!.address as Address).describe()).toBe('city:KL');
  });
});
