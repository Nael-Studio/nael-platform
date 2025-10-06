import type { PackageDocumentation } from '../../types';

export const ormDocumentation: PackageDocumentation = {
  name: '@nl-framework/orm',
  version: '0.1.0',
  description:
    'MongoDB Object Data Mapper with decorators, repositories, and transaction helpers built for the Nael Framework.',
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
  ],
  quickStart: {
    description: 'Define a schema and interact with MongoDB via an injected repository.',
    steps: [
      'Decorate a class with `@Collection` and property decorators to map fields.',
      'Register the ORM module with a Mongo connection string.',
      'Inject the repository into services and execute queries.',
    ],
    code: `import { Module } from '@nl-framework/core';
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
    return this.repo.insertOne({ _id: crypto.randomUUID(), email });
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
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/config'],
};
