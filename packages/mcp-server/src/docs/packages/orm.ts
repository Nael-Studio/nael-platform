import { PackageDocumentation } from '../../types.js';

export const ormPackageDocs: PackageDocumentation = {
  name: '@nl-framework/orm',
  description: 'MongoDB integration with TypeScript decorators, repositories, schemas, and advanced query capabilities',
  version: '1.0.0',
  installation: 'bun add @nl-framework/orm @nl-framework/core mongodb',
  
  features: [
    {
      title: 'Schema Decorators',
      description: 'Define MongoDB schemas using TypeScript decorators',
      icon: '📋'
    },
    {
      title: 'Type-Safe Repositories',
      description: 'Auto-generated repositories with full TypeScript support',
      icon: '🔒'
    },
    {
      title: 'Relationships',
      description: 'Support for one-to-one, one-to-many, and many-to-many relationships',
      icon: '🔗'
    },
    {
      title: 'Query Builder',
      description: 'Fluent query builder with aggregation pipeline support',
      icon: '🔍'
    },
    {
      title: 'Validation',
      description: 'Built-in schema validation and custom validators',
      icon: '✅'
    },
    {
      title: 'Migrations',
      description: 'Database migration support for schema changes',
      icon: '🔄'
    }
  ],
  
  quickStart: {
    description: 'Set up MongoDB ORM in your application',
    steps: [
      'Install dependencies: bun add @nl-framework/orm mongodb',
      'Register MongoModule in your app module',
      'Define entities with @Schema and @Prop decorators',
      'Inject repositories into your services',
      'Perform CRUD operations'
    ],
    code: `// app.module.ts
import { Module } from '@nl-framework/core';
import { MongoModule } from '@nl-framework/orm';

@Module({
  imports: [
    MongoModule.forRoot({
      uri: 'mongodb://localhost:27017/mydb',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    })
  ]
})
export class AppModule {}

// user.entity.ts
import { Schema, Prop } from '@nl-framework/orm';

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

// user.service.ts
import { Injectable } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async create(data: Partial<User>): Promise<User> {
    return this.userRepository.create(data);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ email });
  }
}`
  },
  
  api: {
    decorators: [
      {
        name: '@Schema',
        signature: '@Schema(options?: SchemaOptions)',
        description: 'Marks a class as a MongoDB schema/collection',
        package: '@nl-framework/orm',
        parameters: [
          {
            name: 'options',
            type: 'SchemaOptions',
            description: 'Schema configuration (collection name, timestamps, etc.)',
            required: false
          }
        ],
        examples: [
          `@Schema()
export class User {
  // fields...
}`,
          `@Schema({ 
  collection: 'users',
  timestamps: true,
  versionKey: false
})
export class User {
  // fields...
}`
        ]
      },
      {
        name: '@Prop',
        signature: '@Prop(options?: PropOptions)',
        description: 'Defines a schema property/field',
        package: '@nl-framework/orm',
        parameters: [
          {
            name: 'options',
            type: 'PropOptions',
            description: 'Property configuration (type, required, unique, default, etc.)',
            required: false
          }
        ],
        examples: [
          `@Prop({ required: true })
name: string;`,
          `@Prop({ 
  type: String, 
  required: true, 
  unique: true,
  index: true 
})
email: string;`,
          `@Prop({ 
  type: Number, 
  default: 0,
  min: 0,
  max: 100 
})
age: number;`,
          `@Prop({ type: [String], default: [] })
tags: string[];`
        ]
      },
      {
        name: '@InjectRepository',
        signature: '@InjectRepository(entity: Type<T>)',
        description: 'Injects a repository for the specified entity',
        package: '@nl-framework/orm',
        parameters: [
          {
            name: 'entity',
            type: 'Type<T>',
            description: 'The entity class to inject repository for',
            required: true
          }
        ],
        examples: [
          `constructor(
  @InjectRepository(User)
  private userRepository: Repository<User>
) {}`,
          `constructor(
  @InjectRepository(Post)
  private postRepo: Repository<Post>,
  @InjectRepository(Comment)
  private commentRepo: Repository<Comment>
) {}`
        ]
      },
      {
        name: '@Index',
        signature: '@Index(fields: string | string[], options?: IndexOptions)',
        description: 'Creates an index on the specified fields',
        package: '@nl-framework/orm',
        parameters: [
          {
            name: 'fields',
            type: 'string | string[]',
            description: 'Field(s) to index',
            required: true
          },
          {
            name: 'options',
            type: 'IndexOptions',
            description: 'Index configuration (unique, sparse, etc.)',
            required: false
          }
        ],
        examples: [
          `@Schema()
@Index('email')
export class User {
  @Prop()
  email: string;
}`,
          `@Schema()
@Index(['firstName', 'lastName'])
@Index('email', { unique: true })
export class User {
  @Prop()
  firstName: string;
  
  @Prop()
  lastName: string;
  
  @Prop()
  email: string;
}`
        ]
      },
      {
        name: '@Ref',
        signature: '@Ref(type: () => Type<T>)',
        description: 'Defines a reference to another entity',
        package: '@nl-framework/orm',
        parameters: [
          {
            name: 'type',
            type: '() => Type<T>',
            description: 'Function returning the referenced entity type',
            required: true
          }
        ],
        examples: [
          `@Prop({ type: Types.ObjectId })
@Ref(() => User)
author: User;`,
          `@Prop({ type: [Types.ObjectId] })
@Ref(() => Tag)
tags: Tag[];`
        ]
      },
      {
        name: '@PreSave',
        signature: '@PreSave()',
        description: 'Marks a method to run before saving a document',
        package: '@nl-framework/orm',
        parameters: [],
        examples: [
          `@PreSave()
async hashPassword() {
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
}`,
          `@PreSave()
updateTimestamp() {
  this.updatedAt = new Date();
}`
        ]
      },
      {
        name: '@PostSave',
        signature: '@PostSave()',
        description: 'Marks a method to run after saving a document',
        package: '@nl-framework/orm',
        parameters: [],
        examples: [
          `@PostSave()
async sendWelcomeEmail() {
  await this.emailService.send({
    to: this.email,
    template: 'welcome'
  });
}`
        ]
      }
    ],
    
    classes: [
      {
        name: 'MongoModule',
        description: 'Module for configuring MongoDB connection and repositories',
        package: '@nl-framework/orm',
        constructor: {},
        methods: [
          {
            name: 'forRoot',
            signature: 'static forRoot(options: MongoModuleOptions): DynamicModule',
            description: 'Register MongoModule with connection configuration',
            parameters: [
              {
                name: 'options',
                type: 'MongoModuleOptions',
                description: 'MongoDB connection configuration'
              }
            ],
            returns: 'DynamicModule'
          },
          {
            name: 'forFeature',
            signature: 'static forFeature(entities: Type[]): DynamicModule',
            description: 'Register entities for dependency injection in a feature module',
            parameters: [
              {
                name: 'entities',
                type: 'Type[]',
                description: 'Array of entity classes to register'
              }
            ],
            returns: 'DynamicModule'
          }
        ],
        examples: [
          `// Root module
MongoModule.forRoot({
  uri: 'mongodb://localhost:27017/mydb'
})`,
          `// Feature module
@Module({
  imports: [
    MongoModule.forFeature([User, Post, Comment])
  ],
  providers: [UserService]
})
export class UserModule {}`
        ]
      },
      {
        name: 'Repository<T>',
        description: 'Generic repository for performing CRUD operations on entities',
        package: '@nl-framework/orm',
        constructor: {},
        methods: [
          {
            name: 'create',
            signature: 'create(data: Partial<T>): Promise<T>',
            description: 'Create a new document',
            parameters: [
              {
                name: 'data',
                type: 'Partial<T>',
                description: 'Document data'
              }
            ],
            returns: 'Promise<T>'
          },
          {
            name: 'find',
            signature: 'find(filter?: FilterQuery<T>, options?: FindOptions): Promise<T[]>',
            description: 'Find multiple documents',
            parameters: [
              {
                name: 'filter',
                type: 'FilterQuery<T>',
                description: 'Query filter'
              },
              {
                name: 'options',
                type: 'FindOptions',
                description: 'Query options (limit, skip, sort, etc.)'
              }
            ],
            returns: 'Promise<T[]>'
          },
          {
            name: 'findOne',
            signature: 'findOne(filter: FilterQuery<T>): Promise<T | null>',
            description: 'Find a single document',
            parameters: [
              {
                name: 'filter',
                type: 'FilterQuery<T>',
                description: 'Query filter'
              }
            ],
            returns: 'Promise<T | null>'
          },
          {
            name: 'findById',
            signature: 'findById(id: string): Promise<T | null>',
            description: 'Find a document by ID',
            parameters: [
              {
                name: 'id',
                type: 'string',
                description: 'Document ID'
              }
            ],
            returns: 'Promise<T | null>'
          },
          {
            name: 'update',
            signature: 'update(id: string, data: Partial<T>): Promise<T | null>',
            description: 'Update a document by ID',
            parameters: [
              {
                name: 'id',
                type: 'string',
                description: 'Document ID'
              },
              {
                name: 'data',
                type: 'Partial<T>',
                description: 'Update data'
              }
            ],
            returns: 'Promise<T | null>'
          },
          {
            name: 'updateMany',
            signature: 'updateMany(filter: FilterQuery<T>, data: Partial<T>): Promise<number>',
            description: 'Update multiple documents',
            parameters: [
              {
                name: 'filter',
                type: 'FilterQuery<T>',
                description: 'Query filter'
              },
              {
                name: 'data',
                type: 'Partial<T>',
                description: 'Update data'
              }
            ],
            returns: 'Promise<number>'
          },
          {
            name: 'delete',
            signature: 'delete(id: string): Promise<boolean>',
            description: 'Delete a document by ID',
            parameters: [
              {
                name: 'id',
                type: 'string',
                description: 'Document ID'
              }
            ],
            returns: 'Promise<boolean>'
          },
          {
            name: 'deleteMany',
            signature: 'deleteMany(filter: FilterQuery<T>): Promise<number>',
            description: 'Delete multiple documents',
            parameters: [
              {
                name: 'filter',
                type: 'FilterQuery<T>',
                description: 'Query filter'
              }
            ],
            returns: 'Promise<number>'
          },
          {
            name: 'count',
            signature: 'count(filter?: FilterQuery<T>): Promise<number>',
            description: 'Count documents matching filter',
            parameters: [
              {
                name: 'filter',
                type: 'FilterQuery<T>',
                description: 'Query filter'
              }
            ],
            returns: 'Promise<number>'
          },
          {
            name: 'aggregate',
            signature: 'aggregate(pipeline: any[]): Promise<any[]>',
            description: 'Execute an aggregation pipeline',
            parameters: [
              {
                name: 'pipeline',
                type: 'any[]',
                description: 'Aggregation pipeline stages'
              }
            ],
            returns: 'Promise<any[]>'
          }
        ],
        examples: [
          `const user = await userRepo.create({ 
  name: 'John', 
  email: 'john@example.com' 
});`,
          `const users = await userRepo.find({ 
  age: { $gte: 18 } 
}, { 
  limit: 10, 
  sort: { createdAt: -1 } 
});`,
          `const user = await userRepo.findOne({ email: 'john@example.com' });`,
          `await userRepo.update(userId, { name: 'Jane' });`,
          `await userRepo.delete(userId);`
        ]
      }
    ],
    
    interfaces: [
      {
        name: 'MongoModuleOptions',
        description: 'Configuration options for MongoModule',
        package: '@nl-framework/orm',
        properties: [
          {
            name: 'uri',
            type: 'string',
            description: 'MongoDB connection URI',
            required: true
          },
          {
            name: 'options',
            type: 'MongoClientOptions',
            description: 'MongoDB client options',
            required: false
          },
          {
            name: 'autoIndex',
            type: 'boolean',
            description: 'Automatically create indexes (default: true)',
            required: false
          },
          {
            name: 'retryAttempts',
            type: 'number',
            description: 'Number of connection retry attempts',
            required: false
          },
          {
            name: 'retryDelay',
            type: 'number',
            description: 'Delay between retry attempts in ms',
            required: false
          }
        ],
        examples: [
          `{
  uri: 'mongodb://localhost:27017/mydb'
}`,
          `{
  uri: process.env.MONGO_URI,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10
  },
  autoIndex: true,
  retryAttempts: 5,
  retryDelay: 1000
}`
        ]
      },
      {
        name: 'SchemaOptions',
        description: 'Configuration options for @Schema decorator',
        package: '@nl-framework/orm',
        properties: [
          {
            name: 'collection',
            type: 'string',
            description: 'MongoDB collection name',
            required: false
          },
          {
            name: 'timestamps',
            type: 'boolean',
            description: 'Automatically add createdAt and updatedAt fields',
            required: false
          },
          {
            name: 'versionKey',
            type: 'boolean | string',
            description: 'Version key field name or false to disable',
            required: false
          }
        ],
        examples: [
          `@Schema({ 
  collection: 'users',
  timestamps: true,
  versionKey: false
})`
        ]
      },
      {
        name: 'PropOptions',
        description: 'Configuration options for @Prop decorator',
        package: '@nl-framework/orm',
        properties: [
          {
            name: 'type',
            type: 'any',
            description: 'Property type (String, Number, Boolean, Date, Array, Object)',
            required: false
          },
          {
            name: 'required',
            type: 'boolean',
            description: 'Whether field is required',
            required: false
          },
          {
            name: 'unique',
            type: 'boolean',
            description: 'Whether field must be unique',
            required: false
          },
          {
            name: 'default',
            type: 'any',
            description: 'Default value',
            required: false
          },
          {
            name: 'index',
            type: 'boolean',
            description: 'Create an index on this field',
            required: false
          },
          {
            name: 'min',
            type: 'number',
            description: 'Minimum value (for numbers)',
            required: false
          },
          {
            name: 'max',
            type: 'number',
            description: 'Maximum value (for numbers)',
            required: false
          },
          {
            name: 'enum',
            type: 'any[]',
            description: 'Array of allowed values',
            required: false
          }
        ],
        examples: [
          `@Prop({ 
  type: String, 
  required: true, 
  unique: true 
})
email: string;`,
          `@Prop({ 
  type: Number, 
  min: 0, 
  max: 120,
  default: 0 
})
age: number;`,
          `@Prop({ 
  type: String, 
  enum: ['admin', 'user', 'guest'],
  default: 'user'
})
role: string;`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Complete CRUD Operations',
      description: 'Implement full CRUD with MongoDB ORM',
      code: `// user.entity.ts
import { Schema, Prop, PreSave } from '@nl-framework/orm';
import { Types } from 'mongodb';
import * as bcrypt from 'bcryptjs';

@Schema({ 
  collection: 'users',
  timestamps: true 
})
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ 
    type: String, 
    enum: ['admin', 'user', 'guest'],
    default: 'user'
  })
  role: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  lastLoginAt: Date;

  createdAt: Date;
  updatedAt: Date;

  @PreSave()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2a$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

// user.module.ts
import { Module } from '@nl-framework/core';
import { MongoModule } from '@nl-framework/orm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [
    MongoModule.forFeature([User])
  ],
  providers: [UserService],
  controllers: [UserController]
})
export class UserModule {}

// user.service.ts
import { Injectable, NotFoundException } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(data: Partial<User>): Promise<User> {
    return this.userRepository.create(data);
  }

  async findAll(options?: { 
    limit?: number; 
    skip?: number; 
    role?: string 
  }): Promise<User[]> {
    const filter = options?.role ? { role: options.role } : {};
    
    return this.userRepository.find(filter, {
      limit: options?.limit || 10,
      skip: options?.skip || 0,
      sort: { createdAt: -1 }
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ email });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.update(id, data);
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
  }

  async count(filter?: any): Promise<number> {
    return this.userRepository.count(filter);
  }

  async deactivateInactiveUsers(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.userRepository.updateMany(
      { 
        lastLoginAt: { $lt: cutoffDate },
        isActive: true 
      },
      { isActive: false }
    );
  }
}`,
      tags: ['orm', 'crud', 'mongodb', 'repository'],
      explanation: 'Complete CRUD implementation with entity, service, and repository pattern'
    },
    {
      title: 'Relationships and Population',
      description: 'Define and work with entity relationships',
      code: `// author.entity.ts
import { Schema, Prop } from '@nl-framework/orm';
import { Types } from 'mongodb';

@Schema({ collection: 'authors' })
export class Author {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  bio: string;
}

// post.entity.ts
import { Schema, Prop, Ref } from '@nl-framework/orm';
import { Types } from 'mongodb';
import { Author } from './author.entity';
import { Comment } from './comment.entity';

@Schema({ collection: 'posts', timestamps: true })
export class Post {
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId })
  @Ref(() => Author)
  author: Author;

  @Prop({ type: [Types.ObjectId] })
  @Ref(() => Comment)
  comments: Comment[];

  @Prop({ type: String, enum: ['draft', 'published'], default: 'draft' })
  status: string;

  @Prop({ type: Number, default: 0 })
  viewCount: number;

  createdAt: Date;
  updatedAt: Date;
}

// comment.entity.ts
import { Schema, Prop, Ref } from '@nl-framework/orm';
import { Types } from 'mongodb';
import { Author } from './author.entity';
import { Post } from './post.entity';

@Schema({ collection: 'comments', timestamps: true })
export class Comment {
  _id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId })
  @Ref(() => Author)
  author: Author;

  @Prop({ type: Types.ObjectId })
  @Ref(() => Post)
  post: Post;

  createdAt: Date;
  updatedAt: Date;
}

// blog.module.ts
import { Module } from '@nl-framework/core';
import { MongoModule } from '@nl-framework/orm';
import { Author } from './author.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { BlogService } from './blog.service';

@Module({
  imports: [
    MongoModule.forFeature([Author, Post, Comment])
  ],
  providers: [BlogService]
})
export class BlogModule {}

// blog.service.ts
import { Injectable } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { Author } from './author.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Author)
    private authorRepo: Repository<Author>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>
  ) {}

  async createPost(authorId: string, postData: Partial<Post>): Promise<Post> {
    return this.postRepo.create({
      ...postData,
      author: authorId as any
    });
  }

  async getPostWithAuthor(postId: string): Promise<any> {
    const post = await this.postRepo.findById(postId);
    if (!post) return null;

    // Populate author
    const author = await this.authorRepo.findById(post.author.toString());

    return {
      ...post,
      author
    };
  }

  async getPostWithComments(postId: string): Promise<any> {
    const post = await this.postRepo.findById(postId);
    if (!post) return null;

    // Populate comments
    const comments = await this.commentRepo.find({
      post: postId as any
    });

    // Populate comment authors
    const commentAuthors = await this.authorRepo.find({
      _id: { $in: comments.map(c => c.author) }
    });

    const authorMap = new Map(
      commentAuthors.map(a => [a._id.toString(), a])
    );

    return {
      ...post,
      comments: comments.map(comment => ({
        ...comment,
        author: authorMap.get(comment.author.toString())
      }))
    };
  }

  async addComment(
    postId: string, 
    authorId: string, 
    content: string
  ): Promise<Comment> {
    const comment = await this.commentRepo.create({
      content,
      author: authorId as any,
      post: postId as any
    });

    // Add comment reference to post
    await this.postRepo.update(postId, {
      $push: { comments: comment._id }
    } as any);

    return comment;
  }

  async getAuthorPosts(authorId: string): Promise<Post[]> {
    return this.postRepo.find({
      author: authorId as any
    }, {
      sort: { createdAt: -1 }
    });
  }
}`,
      tags: ['orm', 'relationships', 'populate', 'references'],
      explanation: 'Working with entity relationships and populating referenced documents'
    },
    {
      title: 'Advanced Queries and Aggregation',
      description: 'Complex queries with aggregation pipeline',
      code: `// analytics.service.ts
import { Injectable } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { Post } from './post.entity';
import { User } from './user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(User)
    private userRepo: Repository<User>
  ) {}

  async getPopularPosts(limit: number = 10): Promise<any[]> {
    return this.postRepo.find(
      { status: 'published' },
      { 
        limit,
        sort: { viewCount: -1 }
      }
    );
  }

  async searchPosts(query: string): Promise<Post[]> {
    return this.postRepo.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ],
      status: 'published'
    });
  }

  async getPostsByDateRange(startDate: Date, endDate: Date): Promise<Post[]> {
    return this.postRepo.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });
  }

  async getPostStatsByAuthor(): Promise<any[]> {
    return this.postRepo.aggregate([
      {
        $group: {
          _id: '$author',
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          avgViews: { $avg: '$viewCount' },
          publishedPosts: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'authors',
          localField: '_id',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      {
        $unwind: '$authorInfo'
      },
      {
        $project: {
          authorId: '$_id',
          authorName: '$authorInfo.name',
          authorEmail: '$authorInfo.email',
          totalPosts: 1,
          totalViews: 1,
          avgViews: { $round: ['$avgViews', 2] },
          publishedPosts: 1
        }
      },
      {
        $sort: { totalViews: -1 }
      }
    ]);
  }

  async getTagStatistics(): Promise<any[]> {
    return this.postRepo.aggregate([
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);
  }

  async getMonthlyPostStats(year: number): Promise<any[]> {
    const startDate = new Date(\`\${year}-01-01\`);
    const endDate = new Date(\`\${year}-12-31\`);

    return this.postRepo.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' }
        }
      },
      {
        $sort: { '_id.month': 1 }
      }
    ]);
  }

  async getTrendingTags(days: number = 7): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.postRepo.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate }
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          recentPosts: { $sum: 1 },
          totalViews: { $sum: '$viewCount' }
        }
      },
      {
        $sort: { recentPosts: -1, totalViews: -1 }
      },
      {
        $limit: 10
      }
    ]);
  }

  async getUserEngagementStats(): Promise<any[]> {
    return this.userRepo.aggregate([
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'author',
          as: 'posts'
        }
      },
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'author',
          as: 'comments'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          postsCount: { $size: '$posts' },
          commentsCount: { $size: '$comments' },
          totalViews: { $sum: '$posts.viewCount' },
          engagementScore: {
            $add: [
              { $multiply: [{ $size: '$posts' }, 10] },
              { $multiply: [{ $size: '$comments' }, 2] }
            ]
          }
        }
      },
      {
        $sort: { engagementScore: -1 }
      }
    ]);
  }
}`,
      tags: ['orm', 'queries', 'aggregation', 'analytics'],
      explanation: 'Advanced MongoDB queries with aggregation pipelines for analytics'
    },
    {
      title: 'Validation and Middleware',
      description: 'Schema validation with custom validators and middleware',
      code: `// product.entity.ts
import { Schema, Prop, PreSave, PostSave } from '@nl-framework/orm';
import { Types } from 'mongodb';

@Schema({ collection: 'products', timestamps: true })
export class Product {
  _id: Types.ObjectId;

  @Prop({ 
    required: true,
    validate: {
      validator: (v: string) => v.length >= 3,
      message: 'Name must be at least 3 characters long'
    }
  })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ 
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Price must be a valid number'
    }
  })
  price: number;

  @Prop({ 
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Stock must be an integer'
    }
  })
  stock: number;

  @Prop({ 
    type: String,
    required: true,
    enum: {
      values: ['electronics', 'clothing', 'food', 'books', 'other'],
      message: '{VALUE} is not a valid category'
    }
  })
  category: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ 
    type: String,
    enum: ['available', 'out-of-stock', 'discontinued'],
    default: 'available'
  })
  status: string;

  @Prop({ type: Number, default: 0 })
  discount: number;

  @Prop({ type: Number })
  finalPrice: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  @PreSave()
  calculateFinalPrice() {
    if (this.discount && this.discount > 0) {
      this.finalPrice = this.price - (this.price * this.discount / 100);
    } else {
      this.finalPrice = this.price;
    }
  }

  @PreSave()
  updateStatus() {
    if (this.stock === 0) {
      this.status = 'out-of-stock';
    } else if (this.stock > 0 && this.status === 'out-of-stock') {
      this.status = 'available';
    }
  }

  @PreSave()
  validateDiscount() {
    if (this.discount < 0 || this.discount > 100) {
      throw new Error('Discount must be between 0 and 100');
    }
  }

  @PostSave()
  async notifyLowStock() {
    if (this.stock <= 5 && this.stock > 0) {
      // Send low stock notification
      console.log(\`Low stock alert for product: \${this.name}\`);
    }
  }
}

// order.entity.ts
import { Schema, Prop, Ref, PreSave } from '@nl-framework/orm';
import { Types } from 'mongodb';
import { User } from './user.entity';
import { Product } from './product.entity';

interface OrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
}

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId })
  @Ref(() => User)
  customer: User;

  @Prop({ 
    type: Array,
    required: true,
    validate: {
      validator: (items: OrderItem[]) => items.length > 0,
      message: 'Order must have at least one item'
    }
  })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  tax: number;

  @Prop({ type: Number, default: 0 })
  shipping: number;

  @Prop({ type: Number, required: true })
  total: number;

  @Prop({ 
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Prop({ 
    type: String,
    enum: ['credit-card', 'paypal', 'bank-transfer'],
    required: true
  })
  paymentMethod: string;

  @Prop({ type: Boolean, default: false })
  isPaid: boolean;

  @Prop()
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  createdAt: Date;
  updatedAt: Date;

  @PreSave()
  generateOrderNumber() {
    if (!this.orderNumber) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      this.orderNumber = \`ORD-\${timestamp}-\${random}\`;
    }
  }

  @PreSave()
  calculateTotal() {
    this.subtotal = this.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    this.total = this.subtotal + this.tax + this.shipping;
  }

  @PreSave()
  validateItems() {
    for (const item of this.items) {
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be greater than 0');
      }
      if (item.price < 0) {
        throw new Error('Item price cannot be negative');
      }
    }
  }
}

// product.service.ts
import { Injectable, BadRequestException } from '@nl-framework/core';
import { InjectRepository, Repository } from '@nl-framework/orm';
import { Product } from './product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>
  ) {}

  async create(data: Partial<Product>): Promise<Product> {
    try {
      return await this.productRepo.create(data);
    } catch (error) {
      if (error.message.includes('validation')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async updateStock(productId: string, quantity: number): Promise<Product> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.productRepo.update(productId, { stock: newStock });
  }

  async applyDiscount(productId: string, discount: number): Promise<Product> {
    if (discount < 0 || discount > 100) {
      throw new BadRequestException('Discount must be between 0 and 100');
    }

    return this.productRepo.update(productId, { discount });
  }
}`,
      tags: ['orm', 'validation', 'middleware', 'hooks'],
      explanation: 'Schema validation with custom validators and pre/post save middleware'
    },
    {
      title: 'Transactions and Bulk Operations',
      description: 'Handle transactions and bulk operations safely',
      code: `// inventory.service.ts
import { Injectable, BadRequestException } from '@nl-framework/core';
import { InjectRepository, Repository, MongoClient } from '@nl-framework/orm';
import { Product } from './product.entity';
import { Order } from './order.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private mongoClient: MongoClient
  ) {}

  async processOrder(orderData: Partial<Order>): Promise<Order> {
    const session = this.mongoClient.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 1. Verify and reserve stock
        for (const item of orderData.items!) {
          const product = await this.productRepo.findById(
            item.product.toString()
          );

          if (!product) {
            throw new BadRequestException(
              \`Product \${item.product} not found\`
            );
          }

          if (product.stock < item.quantity) {
            throw new BadRequestException(
              \`Insufficient stock for \${product.name}\`
            );
          }

          // Reduce stock
          await this.productRepo.update(
            product._id.toString(),
            { stock: product.stock - item.quantity }
          );
        }

        // 2. Create order
        const order = await this.orderRepo.create(orderData);

        return order;
      });

      // Transaction succeeded
      return await this.orderRepo.findOne({ 
        orderNumber: orderData.orderNumber 
      });

    } catch (error) {
      // Transaction failed, stock was rolled back
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    const session = this.mongoClient.startSession();

    try {
      await session.withTransaction(async () => {
        const order = await this.orderRepo.findById(orderId);
        if (!order) {
          throw new BadRequestException('Order not found');
        }

        if (order.status === 'delivered') {
          throw new BadRequestException('Cannot cancel delivered order');
        }

        // Restore stock
        for (const item of order.items) {
          const product = await this.productRepo.findById(
            item.product.toString()
          );

          if (product) {
            await this.productRepo.update(
              product._id.toString(),
              { stock: product.stock + item.quantity }
            );
          }
        }

        // Update order status
        await this.orderRepo.update(orderId, { 
          status: 'cancelled' 
        });
      });
    } finally {
      await session.endSession();
    }
  }

  async bulkUpdatePrices(updates: Array<{ 
    productId: string; 
    newPrice: number 
  }>): Promise<number> {
    let updatedCount = 0;

    for (const update of updates) {
      try {
        await this.productRepo.update(update.productId, {
          price: update.newPrice
        });
        updatedCount++;
      } catch (error) {
        console.error(\`Failed to update \${update.productId}\`, error);
      }
    }

    return updatedCount;
  }

  async bulkImportProducts(products: Partial<Product>[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const productData of products) {
      try {
        await this.productRepo.create(productData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          \`Failed to import \${productData.name}: \${error.message}\`
        );
      }
    }

    return results;
  }

  async archiveOldOrders(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.orderRepo.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        status: 'delivered'
      },
      { isActive: false } as any
    );
  }

  async deleteDiscontinuedProducts(): Promise<number> {
    return this.productRepo.deleteMany({
      status: 'discontinued',
      stock: 0
    });
  }
}`,
      tags: ['orm', 'transactions', 'bulk', 'operations'],
      explanation: 'Safe transaction handling and bulk operations for data integrity'
    }
  ],
  
  bestPractices: [
    {
      category: 'Schema Design',
      do: [
        {
          title: 'Use proper types and validation',
          description: 'Define explicit types and validation rules',
          code: `@Prop({ 
  type: String,
  required: true,
  unique: true,
  minlength: 3,
  maxlength: 50
})
username: string;`
        },
        {
          title: 'Use indexes for frequently queried fields',
          description: 'Add indexes to improve query performance',
          code: `@Schema()
@Index('email')
@Index(['firstName', 'lastName'])
export class User {
  @Prop({ index: true })
  email: string;
}`
        },
        {
          title: 'Enable timestamps for audit trails',
          description: 'Track creation and update times automatically',
          code: `@Schema({ 
  timestamps: true  // Adds createdAt and updatedAt
})
export class User {
  createdAt: Date;
  updatedAt: Date;
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t use "any" types',
          description: 'Always specify proper types for type safety',
          code: `// Don't do this
@Prop()
data: any;

// Do this
@Prop({ type: Object })
metadata: { key: string; value: string };`
        },
        {
          title: 'Don\'t forget required validation',
          description: 'Mark essential fields as required',
          code: `// Don't do this
@Prop()
email: string;

// Do this
@Prop({ required: true })
email: string;`
        }
      ]
    },
    {
      category: 'Repository Usage',
      do: [
        {
          title: 'Use specific queries',
          description: 'Query only the data you need',
          code: `// Find with specific filter
const activeUsers = await userRepo.find({ 
  isActive: true 
}, {
  limit: 10,
  sort: { createdAt: -1 }
});`
        },
        {
          title: 'Handle null results',
          description: 'Always check for null from findOne/findById',
          code: `const user = await userRepo.findById(id);
if (!user) {
  throw new NotFoundException('User not found');
}
return user;`
        },
        {
          title: 'Use aggregation for complex queries',
          description: 'Leverage MongoDB aggregation pipeline',
          code: `const stats = await userRepo.aggregate([
  { $match: { isActive: true } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);`
        }
      ],
      dont: [
        {
          title: 'Don\'t load all documents',
          description: 'Always use pagination and limits',
          code: `// Don't do this
const users = await userRepo.find();  // Loads everything!

// Do this
const users = await userRepo.find({}, { 
  limit: 100,
  skip: page * 100 
});`
        },
        {
          title: 'Don\'t ignore errors',
          description: 'Always handle potential errors',
          code: `// Don't do this
await userRepo.create(data);

// Do this
try {
  await userRepo.create(data);
} catch (error) {
  if (error.code === 11000) {
    throw new ConflictException('User already exists');
  }
  throw error;
}`
        }
      ]
    },
    {
      category: 'Performance',
      do: [
        {
          title: 'Use lean queries when you don\'t need methods',
          description: 'Return plain objects for better performance',
          code: `const users = await userRepo.find({}, { 
  lean: true  // Returns plain objects, not model instances
});`
        },
        {
          title: 'Use projection to limit fields',
          description: 'Only select fields you need',
          code: `const users = await userRepo.find({}, {
  select: 'name email'  // Only return name and email
});`
        },
        {
          title: 'Batch operations when possible',
          description: 'Use updateMany/deleteMany for bulk operations',
          code: `// Update many at once
await userRepo.updateMany(
  { isActive: false },
  { deletedAt: new Date() }
);`
        }
      ],
      dont: [
        {
          title: 'Don\'t run queries in loops',
          description: 'Batch queries outside loops',
          code: `// Don't do this
for (const id of userIds) {
  await userRepo.findById(id);  // N queries!
}

// Do this
const users = await userRepo.find({ 
  _id: { $in: userIds } 
});`
        },
        {
          title: 'Don\'t forget to use indexes',
          description: 'Add indexes for frequently queried fields',
          code: `// Add indexes for better query performance
@Schema()
@Index('email')
@Index(['status', 'createdAt'])
export class User { ... }`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'Cannot connect to MongoDB',
      symptoms: [
        'Connection timeout',
        'Authentication failed',
        'Cannot find database'
      ],
      solution: 'Check MongoDB URI and connection configuration',
      code: `// Verify connection string
MongoModule.forRoot({
  uri: 'mongodb://localhost:27017/mydb',  // Correct format
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true
  },
  retryAttempts: 5,
  retryDelay: 3000
})

// For MongoDB Atlas
MongoModule.forRoot({
  uri: 'mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority'
})`
    },
    {
      issue: 'Duplicate key error (E11000)',
      symptoms: [
        'MongoError: E11000 duplicate key error',
        'Unique constraint violation',
        'Cannot insert duplicate value'
      ],
      solution: 'Check for unique constraints and existing documents',
      code: `// Handle duplicate key errors
try {
  await userRepo.create({ email: 'test@example.com' });
} catch (error) {
  if (error.code === 11000) {
    throw new ConflictException('User with this email already exists');
  }
  throw error;
}

// Check before creating
const existing = await userRepo.findOne({ email });
if (existing) {
  throw new ConflictException('User already exists');
}`
    },
    {
      issue: 'Validation errors',
      symptoms: [
        'ValidationError: Path required',
        'Validation failed',
        'Invalid value'
      ],
      solution: 'Ensure all required fields are provided with correct types',
      code: `// Check required fields
@Prop({ required: true })
email: string;

// Validate before saving
try {
  await userRepo.create(data);
} catch (error) {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    throw new BadRequestException(\`Validation failed: \${errors.join(', ')}\`);
  }
  throw error;
}`
    },
    {
      issue: 'Repository not found / Cannot inject repository',
      symptoms: [
        'Cannot find repository',
        'No provider for Repository',
        'Repository is undefined'
      ],
      solution: 'Ensure entity is registered in MongoModule.forFeature',
      code: `// Register entities in feature module
@Module({
  imports: [
    MongoModule.forFeature([User, Post, Comment])  // Register here!
  ],
  providers: [UserService]
})
export class UserModule {}

// Then inject in service
constructor(
  @InjectRepository(User)
  private userRepo: Repository<User>
) {}`
    },
    {
      issue: 'Slow queries / Performance issues',
      symptoms: [
        'Queries taking too long',
        'High database load',
        'Timeout errors'
      ],
      solution: 'Add indexes and optimize queries',
      code: `// Add indexes to schema
@Schema()
@Index('email')
@Index(['status', 'createdAt'])
@Index({ location: '2dsphere' })  // For geospatial queries
export class User { ... }

// Use explain to analyze queries
const explanation = await userRepo.collection.find({
  email: 'test@example.com'
}).explain();

console.log(explanation);  // Check if indexes are used

// Use pagination
const users = await userRepo.find({}, {
  limit: 20,
  skip: page * 20,
  sort: { createdAt: -1 }
});`
    }
  ],
  
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform', 'mongodb'],
  
  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release with MongoModule and Repository',
        'Schema decorators: @Schema, @Prop, @Ref, @Index',
        'Lifecycle hooks: @PreSave, @PostSave',
        'Complete CRUD operations',
        'Query builder and aggregation support',
        'Relationship management',
        'Validation and custom validators',
        'Transaction support'
      ]
    }
  ]
};
