import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";

const basicPipe = `import { PipeTransform, ArgumentMetadata } from '@nl-framework/http';

export class TrimPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    return typeof value === 'string' ? value.trim() : value;
  }
}`;

const usePipe = `import { Controller, Get, Query, UsePipes } from '@nl-framework/http';
import { TrimPipe } from './pipes/trim.pipe';

@Controller('/search')
export class SearchController {
  @Get('/')
  search(@Query('q', TrimPipe) query: string) {
    return { query };
  }
}`;

const parseIntPipe = `import { Controller, Get, Param, ParseIntPipe } from '@nl-framework/http';

@Controller('/users')
export class UsersController {
  @Get('/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // id is automatically converted to a number
    return { id, type: typeof id }; // { id: 123, type: 'number' }
  }
}`;

const builtInPipes = `import {
  ParseIntPipe,
  ParseFloatPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  DefaultValuePipe,
} from '@nl-framework/http';

@Controller('/products')
export class ProductsController {
  @Get('/')
  list(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('active', ParseBoolPipe) active: boolean,
    @Query('tags', new ParseArrayPipe({ separator: ',' })) tags: string[],
    @Query('sort', new DefaultValuePipe('name')) sort: string,
  ) {
    return { page, limit, active, tags, sort };
  }
}`;

const validationPipe = `import { Controller, Post, Body, ValidationPipe } from '@nl-framework/http';
import { IsEmail, IsString, MinLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  name!: string;
}

@Controller('/users')
export class UsersController {
  @Post('/')
  create(@Body(ValidationPipe) data: CreateUserDto) {
    // data is validated and transformed
    return { message: 'User created', data };
  }
}`;

const globalValidation = `import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nl-framework/http';

@Controller('/users')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class UsersController {
  @Post('/')
  create(@Body() data: CreateUserDto) {
    // ValidationPipe is applied to all parameters
    return { message: 'User created', data };
  }

  @Post('/bulk')
  createMany(@Body() data: CreateUserDto[]) {
    // ValidationPipe is applied here too
    return { message: 'Users created', count: data.length };
  }
}`;

const methodLevelPipes = `import { Controller, Post, UsePipes, ValidationPipe } from '@nl-framework/http';

@Controller('/products')
export class ProductsController {
  @Post('/')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Body() data: CreateProductDto) {
    return { message: 'Product created', data };
  }

  @Post('/import')
  @UsePipes(new ValidationPipe({ skipMissingProperties: true }))
  import(@Body() data: ImportProductDto[]) {
    return { message: 'Products imported', count: data.length };
  }
}`;

const customValidationPipe = `import { PipeTransform, ArgumentMetadata, HttpException } from '@nl-framework/http';

export class FileSizeValidationPipe implements PipeTransform {
  constructor(private readonly maxSize: number) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (value?.size && value.size > this.maxSize) {
      throw HttpException.badRequest(
        \`File size exceeds maximum of \${this.maxSize} bytes\`
      );
    }
    return value;
  }
}

@Controller('/upload')
export class UploadController {
  @Post('/')
  upload(@Body(new FileSizeValidationPipe(1024 * 1024)) file: any) {
    return { message: 'File uploaded', size: file.size };
  }
}`;

const transformPipe = `import { PipeTransform, ArgumentMetadata } from '@nl-framework/http';

export class UpperCasePipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    return value?.toUpperCase() || value;
  }
}

export class SlugifyPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\\w\\s-]/g, '')
      .replace(/[\\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

@Controller('/posts')
export class PostsController {
  @Post('/')
  create(
    @Body('title', SlugifyPipe) slug: string,
    @Body('name', UpperCasePipe) name: string,
  ) {
    return { slug, name };
  }
}`;

const asyncPipe = `import { PipeTransform, ArgumentMetadata, HttpException } from '@nl-framework/http';

export class UserExistsPipe implements PipeTransform {
  async transform(userId: string, metadata: ArgumentMetadata): Promise<string> {
    const user = await this.findUser(userId);
    
    if (!user) {
      throw HttpException.notFound(\`User with ID \${userId} not found\`);
    }
    
    return userId;
  }

  private async findUser(id: string) {
    // Query database
    return null;
  }
}

@Controller('/posts')
export class PostsController {
  @Post('/')
  create(
    @Body('userId', UserExistsPipe) userId: string,
    @Body('title') title: string,
  ) {
    return { userId, title };
  }
}`;

const parseArrayPipe = `import { Controller, Get, Query, ParseArrayPipe, ParseIntPipe } from '@nl-framework/http';

@Controller('/products')
export class ProductsController {
  @Get('/filter')
  filter(
    // Parse comma-separated string into array
    @Query('tags', new ParseArrayPipe({ separator: ',' })) tags: string[],
    
    // Parse comma-separated numbers
    @Query(
      'ids',
      new ParseArrayPipe({ separator: ',', items: new ParseIntPipe() })
    ) ids: number[],
  ) {
    return { tags, ids };
  }
}`;

const pipeChaining = `import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nl-framework/http';

@Controller('/products')
export class ProductsController {
  @Get('/')
  list(
    // First DefaultValuePipe, then ParseIntPipe
    @Query('page', new DefaultValuePipe('1'), ParseIntPipe) page: number,
  ) {
    return { page };
  }
}`;

const validationOptions = `import { ValidationPipe } from '@nl-framework/http';

// Basic validation
new ValidationPipe()

// Transform and validate
new ValidationPipe({ transform: true })

// Strip unknown properties
new ValidationPipe({ whitelist: true })

// Throw error on unknown properties
new ValidationPipe({ forbidNonWhitelisted: true })

// Skip missing properties during validation
new ValidationPipe({ skipMissingProperties: true })

// Validate specific groups
new ValidationPipe({ groups: ['create'] })

// Custom exception factory
new ValidationPipe({
  exceptionFactory: (errors) => {
    return HttpException.unprocessableEntity(
      \`Validation failed: \${errors.length} errors\`
    );
  },
})`;

const diPipe = `import { Injectable } from '@nl-framework/core';
import { PipeTransform, ArgumentMetadata, HttpException } from '@nl-framework/http';
import { DatabaseService } from './database.service';

@Injectable()
export class EntityExistsPipe implements PipeTransform {
  constructor(private readonly db: DatabaseService) {}

  async transform(id: string, metadata: ArgumentMetadata): Promise<string> {
    const exists = await this.db.exists(id);
    
    if (!exists) {
      throw HttpException.notFound(\`Entity \${id} not found\`);
    }
    
    return id;
  }
}

// Register as a provider
@Module({
  providers: [EntityExistsPipe, DatabaseService],
  controllers: [EntityController],
})
export class EntityModule {}`;

export const metadata: Metadata = {
  title: "Pipes · Nael Platform",
  description: "Learn how to use pipes for transforming and validating input data before it reaches route handlers in Nael applications.",
};

export default function PipesPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Overview</p>
        <h1 className="text-4xl font-semibold">Pipes</h1>
        <p className="max-w-2xl text-muted-foreground">
          A pipe is a class annotated with the <code>PipeTransform</code> interface. Pipes have two typical use cases: 
          <strong> transformation</strong> (transform input data to the desired form) and <strong>validation</strong> 
          (evaluate input data and if valid, pass it through unchanged; otherwise, throw an exception).
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Creating a pipe</h2>
        <p className="text-muted-foreground">
          Pipes implement the <code>PipeTransform&lt;T, R&gt;</code> interface, which requires a <code>transform()</code> method.
          This method takes two parameters: the value to transform and metadata about the argument.
        </p>
        <CodeBlock code={basicPipe} title="trim.pipe.ts" />
        <p className="text-sm text-muted-foreground">
          The <code>transform()</code> method can be synchronous or asynchronous. It should return the transformed value
          or throw an exception if validation fails.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Using pipes</h2>
        <p className="text-muted-foreground">
          Pipes can be applied directly to route handler parameters. Simply pass the pipe class or instance after the parameter decorator:
        </p>
        <CodeBlock code={usePipe} title="search.controller.ts" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Built-in pipes</h2>
        <p className="text-muted-foreground">
          Nael provides several built-in pipes for common transformation tasks:
        </p>
        <CodeBlock code={parseIntPipe} title="ParseIntPipe example" />
        <p className="text-sm text-muted-foreground">
          All built-in pipes are exported from <code>@nl-framework/http</code>:
        </p>
        <CodeBlock code={builtInPipes} title="Using built-in pipes" />
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li><code>ParseIntPipe</code> - Converts string to integer</li>
          <li><code>ParseFloatPipe</code> - Converts string to float</li>
          <li><code>ParseBoolPipe</code> - Converts string to boolean</li>
          <li><code>ParseArrayPipe</code> - Splits string into array</li>
          <li><code>DefaultValuePipe</code> - Provides default value for undefined/null</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Validation pipe</h2>
        <p className="text-muted-foreground">
          The <code>ValidationPipe</code> uses <code>class-validator</code> and <code>class-transformer</code> to validate
          and transform input based on DTO class decorators:
        </p>
        <CodeBlock code={validationPipe} title="Using ValidationPipe" />
        <p className="text-sm text-muted-foreground">
          If validation fails, the pipe throws an <code>HttpException</code> with a 400 status code.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Global pipes</h2>
        <p className="text-muted-foreground">
          Use <code>@UsePipes()</code> at the class level to apply pipes to all handler methods:
        </p>
        <CodeBlock code={globalValidation} title="Controller-level pipes" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Method-level pipes</h2>
        <p className="text-muted-foreground">
          Apply <code>@UsePipes()</code> at the method level for more granular control:
        </p>
        <CodeBlock code={methodLevelPipes} title="Method-level pipes" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Custom validation pipes</h2>
        <p className="text-muted-foreground">
          Create custom pipes for specialized validation logic:
        </p>
        <CodeBlock code={customValidationPipe} title="Custom validation pipe" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Transformation pipes</h2>
        <p className="text-muted-foreground">
          Pipes can transform input data before it reaches the handler:
        </p>
        <CodeBlock code={transformPipe} title="Transformation pipes" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Async pipes</h2>
        <p className="text-muted-foreground">
          Pipes can be asynchronous, making them suitable for database lookups or API calls:
        </p>
        <CodeBlock code={asyncPipe} title="Async pipe" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Parsing arrays</h2>
        <p className="text-muted-foreground">
          <code>ParseArrayPipe</code> can split strings and transform individual items:
        </p>
        <CodeBlock code={parseArrayPipe} title="ParseArrayPipe examples" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Pipe chaining</h2>
        <p className="text-muted-foreground">
          Multiple pipes can be applied to a single parameter. They execute in order:
        </p>
        <CodeBlock code={pipeChaining} title="Chaining pipes" />
        <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> Pipes are executed in the order they are specified. The output of one pipe
            becomes the input of the next.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Validation pipe options</h2>
        <p className="text-muted-foreground">
          The <code>ValidationPipe</code> accepts various options to customize its behavior:
        </p>
        <CodeBlock code={validationOptions} title="ValidationPipe options" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dependency injection</h2>
        <p className="text-muted-foreground">
          Pipes can use dependency injection when registered as providers:
        </p>
        <CodeBlock code={diPipe} title="Pipe with dependency injection" />
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Important:</strong> Pipes must be registered as providers in a module to use dependency injection.
            Otherwise, they are instantiated directly and dependencies won&apos;t be resolved.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Execution order</h2>
        <p className="text-muted-foreground">
          Understanding pipe execution order helps build robust data processing pipelines:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Controller-level pipes (from <code>@UsePipes()</code> on class)</li>
          <li>Method-level pipes (from <code>@UsePipes()</code> on method)</li>
          <li>Parameter-level pipes (from parameter decorator)</li>
          <li>For multiple pipes on same parameter, they execute left-to-right</li>
          <li>If any pipe throws, subsequent pipes are skipped and exception is caught</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>Use built-in pipes first</strong> - They handle common cases efficiently
          </li>
          <li>
            <strong>Keep pipes focused</strong> - Each pipe should do one thing well
          </li>
          <li>
            <strong>Validate early</strong> - Use pipes to validate at the entry point
          </li>
          <li>
            <strong>Provide clear errors</strong> - Throw meaningful exceptions with context
          </li>
          <li>
            <strong>Consider performance</strong> - Async pipes add latency, use sparingly
          </li>
          <li>
            <strong>Make pipes reusable</strong> - Design for use across multiple endpoints
          </li>
          <li>
            <strong>Document expectations</strong> - Clearly specify what pipes transform/validate
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">What&apos;s next?</h2>
        <p className="text-muted-foreground">
          Learn about <Link className="text-primary" href="/docs/guards">Guards</Link> for authentication and authorization,
          or explore <Link className="text-primary" href="/docs/interceptors">Interceptors</Link> for request/response transformation.
        </p>
      </section>
    </div>
  );
}
