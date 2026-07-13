import { describe, expect, it } from 'bun:test';
import { Inject, Injectable } from '@nl-framework/core';
import { Document, getRepositoryToken } from '@nl-framework/orm';
import { InMemoryRepository, createInMemoryRepository, Test } from '../src';

@Document()
class User {
  id!: string;
  name!: string;
  age!: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

describe('InMemoryRepository', () => {
  it('assigns identifiers, timestamps, and soft-delete markers on insert', async () => {
    const repo = new InMemoryRepository(User);
    const created = await repo.insertOne({ name: 'Ada', age: 36 });

    expect(created.id).toBeTypeOf('string');
    expect(created.id.length).toBeGreaterThan(0);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
    expect(created.deletedAt).toBeNull();
  });

  it('supports find/findOne/findById/count with filter operators', async () => {
    const repo = new InMemoryRepository(User, {
      seed: [
        { name: 'Ada', age: 36 },
        { name: 'Grace', age: 45 },
        { name: 'Kid', age: 12 },
      ],
    });

    expect(await repo.count()).toBe(3);
    expect(await repo.count({ age: { $gte: 18 } })).toBe(2);

    const adults = await repo.find({ age: { $gte: 18 } }, { sort: { age: 1 } });
    expect(adults.map((u) => u.name)).toEqual(['Ada', 'Grace']);

    const grace = await repo.findOne({ name: { $in: ['Grace', 'Nobody'] } });
    expect(grace?.age).toBe(45);

    const byId = await repo.findById(grace!.id);
    expect(byId?.name).toBe('Grace');
  });

  it('applies sort, skip, and limit', async () => {
    const repo = new InMemoryRepository(User, {
      seed: [
        { name: 'a', age: 10 },
        { name: 'b', age: 20 },
        { name: 'c', age: 30 },
      ],
    });

    const page = await repo.find({}, { sort: { age: -1 }, skip: 1, limit: 1 });
    expect(page.map((u) => u.name)).toEqual(['b']);
  });

  it('save() updates an existing document and refreshes updatedAt', async () => {
    const repo = new InMemoryRepository(User);
    const created = await repo.insertOne({ name: 'Ada', age: 36 });
    const firstUpdatedAt = created.updatedAt!.getTime();

    await new Promise((resolve) => setTimeout(resolve, 2));
    const saved = await repo.save({ id: created.id, age: 37 });

    expect(saved.age).toBe(37);
    expect(saved.name).toBe('Ada'); // untouched fields preserved
    expect(saved.updatedAt!.getTime()).toBeGreaterThanOrEqual(firstUpdatedAt);
    expect(await repo.count()).toBe(1); // updated in place, not inserted
  });

  it('save() without an id inserts a new document', async () => {
    const repo = new InMemoryRepository(User);
    const saved = await repo.save({ name: 'New', age: 1 });
    expect(saved.id).toBeTypeOf('string');
    expect(await repo.count()).toBe(1);
  });

  it('updateMany() patches every matching document', async () => {
    const repo = new InMemoryRepository(User, {
      seed: [
        { name: 'a', age: 10 },
        { name: 'b', age: 10 },
        { name: 'c', age: 99 },
      ],
    });

    const modified = await repo.updateMany({ age: 10 }, { age: 11 });
    expect(modified).toBe(2);
    expect(await repo.count({ age: 11 })).toBe(2);
  });

  it('softDelete() hides documents from reads; withDeleted and restore recover them', async () => {
    const repo = new InMemoryRepository(User, { seed: [{ name: 'Ada', age: 36 }] });
    const [ada] = await repo.find();

    const deleted = await repo.softDelete({ id: ada!.id });
    expect(deleted).toBe(1);
    expect(await repo.count()).toBe(0);
    expect(await repo.find()).toEqual([]);
    expect(await repo.count({}, { withDeleted: true })).toBe(1);

    const restored = await repo.restore({ id: ada!.id });
    expect(restored).toBe(1);
    expect(await repo.count()).toBe(1);
  });

  it('deleteHard()/deleteMany() remove documents entirely', async () => {
    const repo = new InMemoryRepository(User, {
      seed: [
        { name: 'a', age: 1 },
        { name: 'b', age: 2 },
      ],
    });

    expect(await repo.deleteHard({ name: 'a' })).toBe(1);
    expect(repo.size).toBe(1);
    expect(await repo.deleteMany({})).toBe(1);
    expect(repo.size).toBe(0);
  });

  it('createInMemoryRepository honors @Document({ softDelete: false })', async () => {
    @Document({ softDelete: false })
    class Ephemeral {
      id!: string;
      value!: string;
    }

    const repo = await createInMemoryRepository(Ephemeral, { seed: [{ value: 'x' }] });
    const [only] = await repo.find();

    // With soft delete disabled, softDelete() hard-removes.
    const removed = await repo.softDelete({ id: only!.id });
    expect(removed).toBe(1);
    expect(repo.size).toBe(0);
  });

  it('slots into DI as a repository substitute a service can inject', async () => {
    @Injectable()
    class UserService {
      constructor(
        @Inject(getRepositoryToken(User)) private readonly repo: InMemoryRepository<User>,
      ) {}

      adults(): Promise<Array<{ name: string }>> {
        return this.repo.find({ age: { $gte: 18 } }, { sort: { age: 1 } });
      }
    }

    const repo = new InMemoryRepository(User, {
      seed: [
        { name: 'Ada', age: 36 },
        { name: 'Kid', age: 12 },
      ],
    });

    const moduleRef = await Test.createTestingModule({
      providers: [{ provide: getRepositoryToken(User), useValue: repo }, UserService],
    }).compile();

    const service = await moduleRef.get(UserService);
    const adults = await service.adults();
    expect(adults.map((u) => u.name)).toEqual(['Ada']);

    await moduleRef.close();
  });
});
