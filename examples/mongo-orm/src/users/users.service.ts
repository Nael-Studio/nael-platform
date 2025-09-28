import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, ObjectId } from '@nl-framework/orm';
import type { OrmRepository, OrmEntityDocument } from '@nl-framework/orm';
import type { Filter } from 'mongodb';
import { User } from './user.document';

export interface CreateUserInput {
  email: string;
  name: string;
  role?: 'admin' | 'member';
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(getRepositoryToken(User))
    private readonly users: OrmRepository<User>,
  ) {}

  async findAll(withDeleted = false): Promise<Array<OrmEntityDocument<User>>> {
    return (await this.users.find({}, { withDeleted })) as Array<OrmEntityDocument<User>>;
  }

  async findOne(id: string, withDeleted = false): Promise<OrmEntityDocument<User> | null> {
    const filter: Filter<User> = { _id: this.toObjectId(id) };
    return (await this.users.findOne(filter, { withDeleted })) as OrmEntityDocument<User> | null;
  }

  async create(input: CreateUserInput): Promise<OrmEntityDocument<User>> {
    const payload = {
      email: input.email,
      name: input.name,
      role: input.role ?? 'member',
    } satisfies Partial<User>;

  const emailFilter: Filter<User> = { email: input.email };
    const existing = (await this.users.findOne(emailFilter, {
      withDeleted: true,
    })) as OrmEntityDocument<User> | null;

    if (existing) {
      return (await this.users.save({
        _id: existing._id,
        ...payload,
        deletedAt: null,
      } as Partial<User> & { _id: ObjectId })) as OrmEntityDocument<User>;
    }

    return (await this.users.insertOne(payload)) as OrmEntityDocument<User>;
  }

  async softDelete(id: string): Promise<boolean> {
  const filter: Filter<User> = { _id: this.toObjectId(id) };
    const modified = await this.users.softDelete(filter);
    return modified > 0;
  }

  async restore(id: string): Promise<boolean> {
  const filter: Filter<User> = { _id: this.toObjectId(id) };
    const restored = await this.users.restore(filter);
    return restored > 0;
  }

  private toObjectId(id: string | ObjectId): ObjectId {
    if (id instanceof ObjectId) {
      return id;
    }

    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }

    return new ObjectId(id);
  }
}
