import { Metadata } from "next";
import { CodeBlock } from "@/components/shared/simple-code-block";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const basicUsage = `import { ApplicationException } from '@nl-framework/graphql';
import { Resolver, Query, Mutation, Arg } from '@nl-framework/graphql';

@Resolver()
export class UserResolver {
  @Query(() => User)
  async getUser(@Arg('id') id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw ApplicationException.notFound('User not found');
    }
    
    return user;
  }
  
  @Mutation(() => User)
  async createUser(@Arg('input') input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    
    if (existing) {
      throw ApplicationException.conflict(
        'User already exists',
        { email: input.email }
      );
    }
    
    return this.userRepository.create(input);
  }
}`;

const customFilter = `import { GraphQLExceptionFilter } from '@nl-framework/graphql';
import { GraphQLError } from 'graphql';
import { ApplicationException } from '@nl-framework/core';

export class CustomGraphQLExceptionFilter implements GraphQLExceptionFilter {
  async catch(exception: Error): Promise<GraphQLError | null> {
    if (exception instanceof ApplicationException) {
      return new GraphQLError(exception.message, {
        extensions: {
          code: exception.code,
          details: exception.details,
          timestamp: new Date().toISOString(),
          service: 'user-service',
        },
      });
    }
    
    return null;
  }
}`;

const registerFilter = `import { 
  createGraphqlApplication, 
  registerGraphQLExceptionFilter 
} from '@nl-framework/graphql';
import { CustomGraphQLExceptionFilter } from './filters/custom.filter';

async function bootstrap() {
  const app = await createGraphqlApplication({
    modules: [AppModule],
  });
  
  registerGraphQLExceptionFilter(new CustomGraphQLExceptionFilter());
  
  await app.start();
}`;

const errorResponse = `{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["getUser"],
      "extensions": {
        "code": "NOT_FOUND",
        "details": { "userId": "123" }
      }
    }
  ]
}`;

const authError = `@Resolver()
export class PostResolver {
  @Query(() => [Post])
  async myPosts(@Context('user') user: User): Promise<Post[]> {
    if (!user) {
      throw ApplicationException.unauthorized('You must be logged in');
    }
    
    return this.postRepository.findByAuthor(user.id);
  }
}`;

const validationError = `@Resolver()
export class PostResolver {
  @Mutation(() => Post)
  async createPost(@Arg('input') input: CreatePostInput): Promise<Post> {
    if (input.title.length < 3) {
      throw ApplicationException.validationError(
        'Title must be at least 3 characters',
        { field: 'title', min: 3 }
      );
    }
    
    return this.postRepository.create(input);
  }
}`;

const advancedFilter = `export class DetailedGraphQLExceptionFilter implements GraphQLExceptionFilter {
  async catch(exception: Error): Promise<GraphQLError | null> {
    if (exception.message.includes('unique constraint')) {
      return new GraphQLError('Duplicate entry', {
        extensions: {
          code: 'DUPLICATE_ENTRY',
          originalError: exception.message,
        },
      });
    }
    
    if (exception instanceof ApplicationException) {
      return new GraphQLError(exception.message, {
        extensions: {
          code: exception.code,
          details: exception.details,
          cause: exception.cause?.message,
        },
      });
    }
    
    if (process.env.NODE_ENV === 'production') {
      return new GraphQLError('An error occurred', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
    
    return null;
  }
}`;

export const metadata: Metadata = {
  title: "GraphQL Exception Handling - NL Framework",
  description: "Learn how to handle exceptions in GraphQL resolvers using NL Framework",
};

export default function GraphQLExceptionHandlingPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-primary/10 text-primary">GraphQL</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Exception Handling</h1>
        <p className="text-lg text-muted-foreground">
          Exception handling in GraphQL allows you to catch and format errors from resolvers, 
          providing consistent error responses to clients. NL Framework provides exception filters 
          that integrate seamlessly with GraphQL error formatting.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Transport-Agnostic:</strong> <code>ApplicationException</code> from{" "}
            <code>@nl-framework/core</code> works across HTTP, GraphQL, and any other transport layer. 
            Use the same exception class everywhere!
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" id="application-exception">
        <h2 className="text-2xl font-semibold">ApplicationException</h2>
        <p className="text-muted-foreground">
          The <code>ApplicationException</code> class is transport-agnostic and automatically converts to 
          appropriate GraphQL error codes:
        </p>
        <CodeBlock code={basicUsage} title="Using ApplicationException in resolvers" />
      </section>

      <section className="space-y-4" id="error-codes">
        <h2 className="text-2xl font-semibold">GraphQL Error Codes</h2>
        <p className="text-muted-foreground">
          <code>ApplicationException</code> error codes are automatically mapped to GraphQL error codes:
        </p>
        <Card className="border-border/70">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4 font-semibold text-muted-foreground">
                <div>ApplicationException Code</div>
                <div>GraphQL Error Code</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><code>BAD_REQUEST</code></div>
                <div><code>BAD_USER_INPUT</code></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><code>UNAUTHORIZED</code></div>
                <div><code>UNAUTHENTICATED</code></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><code>FORBIDDEN</code></div>
                <div><code>FORBIDDEN</code></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><code>NOT_FOUND</code></div>
                <div><code>NOT_FOUND</code></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><code>VALIDATION_ERROR</code></div>
                <div><code>BAD_USER_INPUT</code></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" id="exception-filters">
        <h2 className="text-2xl font-semibold">GraphQL Exception Filters</h2>
        <p className="text-muted-foreground">
          Exception filters allow you to customize how exceptions are converted to GraphQL errors:
        </p>
        <CodeBlock code={customFilter} title="Custom exception filter" />
        
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">Registering Exception Filters</h3>
          <CodeBlock code={registerFilter} title="Register global filter" />
        </div>
      </section>

      <section className="space-y-4" id="error-response-format">
        <h2 className="text-2xl font-semibold">Error Response Format</h2>
        <p className="text-muted-foreground">
          GraphQL errors are returned in the standard GraphQL error format:
        </p>
        <CodeBlock code={errorResponse} title="GraphQL error response" />
      </section>

      <section className="space-y-4" id="common-patterns">
        <h2 className="text-2xl font-semibold">Common Patterns</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-3">Authentication Errors</h3>
            <CodeBlock code={authError} title="Unauthorized access" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">Validation Errors</h3>
            <CodeBlock code={validationError} title="Input validation" />
          </div>
        </div>
      </section>

      <section className="space-y-4" id="advanced-filter">
        <h2 className="text-2xl font-semibold">Advanced Exception Filter</h2>
        <CodeBlock code={advancedFilter} title="Production-ready filter" />
      </section>

      <section className="space-y-4" id="best-practices">
        <h2 className="text-2xl font-semibold">Best Practices</h2>
        <Card className="border-border/70">
          <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
            <p><strong>Use ApplicationException:</strong> Always use <code>ApplicationException</code> for consistent error handling across HTTP and GraphQL.</p>
            <p><strong>Include Details:</strong> Add relevant details to help clients understand and handle errors appropriately.</p>
            <p><strong>Don't Expose Sensitive Information:</strong> Never include passwords, tokens, or sensitive data in error messages.</p>
            <p><strong>Use Appropriate Error Codes:</strong> Choose the right error code to help clients handle errors programmatically.</p>
            <p><strong>Filter Errors in Production:</strong> Use exception filters to hide internal error details in production.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="pt-6">
          <p className="text-sm text-green-900 dark:text-green-100">
            <strong>✅ Summary:</strong> GraphQL exception handling in NL Framework uses <code>ApplicationException</code> for 
            transport-agnostic errors with automatic conversion to standard GraphQL error codes. Exception filters enable 
            custom error formatting, and the system provides consistent error handling across HTTP and GraphQL.
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
