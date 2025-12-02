import type { PackageDocumentation } from '../../types';

export const ormDocumentation: PackageDocumentation = {
  name: '@nl-framework/orm',
  version: '0.2.7',
  description:
    'MongoDB Object Data Mapper with decorators, repositories, and transaction helpers built for the NL Framework Framework.',
  installation: 'bun add @nl-framework/orm mongodb',
  features: [
    {
      title: 'Schema Decorators',
      description: 'Define collections and indexes directly on TypeScript classes using decorators.',
      icon: '🧾',
    },
    {
      title: 'Repository Pattern',
      description: 'Inject repositories that wrap the MongoDB driver with high-level methods.',
      icon: '📚',
    },
    {
      title: 'Transactions',
      description: 'Execute multi-operation transactions effortlessly with session helpers.',
      icon: '💳',
    },
    {
      title: 'Consistent Identifier Handling',
      description: '`repository.save` keeps `id` and `_id` synchronized whether you use strings or ObjectIds.',
      icon: '🆔',
    },
  ],
  quickStart: {
    description: 'Define a schema and interact with MongoDB via an injected repository.',
    steps: [
      'Decorate a class with `@Collection` and property decorators to map fields.',
      'Register the ORM module with a Mongo connection string.',
      'Inject the repository into services and execute queries with the high-level helpers.',
    ],
  code: `import { Module, Injectable } from '@nl-framework/core';
import { Collection, Field, InjectRepository, MongoOrmModule, Repository } from '@nl-framework/orm';

@Collection('users')
class UserDocument {
  @Field()
  _id!: string;

  @Field()
  email!: string;
}

@Injectable()
class UsersService {
  constructor(@InjectRepository(UserDocument) private readonly repo: Repository<UserDocument>) {}

  async create(email: string) {
    const saved = await this.repo.save({ email });
    // saved.id is a string; saved._id is an ObjectId
    return saved;
  }
}

@Module({
  imports: [
    MongoOrmModule.forRoot({
      uri: 'mongodb://localhost:27017/nael',
    }),
  ],
  providers: [UsersService],
})
export class AppModule {}
`,
  },
  api: {
    decorators: [
      {
        name: '@Collection',
        signature: "@Collection(name: string, options?: CollectionOptions): ClassDecorator",
        description: 'Declare the MongoDB collection backing a document class.',
      },
      {
        name: '@Field',
        signature: '@Field(options?: FieldOptions): PropertyDecorator',
        description: 'Map a class property to a MongoDB field with optional validation metadata.',
      },
    ],
    classes: [
      {
        name: 'Repository<T>',
        description: 'Typed repository exposing CRUD helpers wrapping the MongoDB driver.',
        methods: [
          {
            name: 'find',
            signature: 'find(filter: Filter<T>): Promise<T[]>',
            description: 'Retrieve matching documents.',
          },
          {
            name: 'withTransaction',
            signature: 'withTransaction(work: (session: ClientSession) => Promise<void>): Promise<void>',
            description: 'Execute work inside a MongoDB transaction.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Unique Index Definition',
      description: 'Ensure email addresses are unique across documents.',
      code: `@Collection('users', { indexes: [{ keys: { email: 1 }, options: { unique: true } }] })
class UserDocument {}
`,
    },
  ],
  bestPractices: [
    {
      category: 'Data Integrity',
      do: [
        {
          title: 'Use DTOs for mutations',
          description: 'Validate input using DTOs before persisting to Mongo.',
        },
        {
          title: 'Prefer repository.save for upserts',
          description: 'The helper normalizes identifiers and timestamps for you, reducing manual driver usage.',
        },
      ],
      dont: [
        {
          title: 'Avoid leaking driver types',
          description: 'Keep repository usage behind services to maintain consistent domain models.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Connection refused',
      symptoms: ['Unhandled MongoNetworkError'],
      solution:
        'Check MongoDB availability and ensure the URI is accessible from the running environment.',
    },
    {
      issue: 'Reloaded documents lose their string id',
      symptoms: ['Follow-up `findById` returns `_id` but missing `id`', 'String ids no longer match collection data'],
      solution:
        'Upgrade to v0.2.7+ and rely on `repository.save` which synchronizes `id` and `_id`. Run `bun run packages/orm/tests/scripts/save-reload-real-mongo.ts` against your database to verify.',
      relatedTopics: ['repository.save'],
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/config'],
};
