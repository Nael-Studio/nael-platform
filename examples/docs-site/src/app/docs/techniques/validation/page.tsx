import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const dtoExample = `import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Type(() => Number)
  age?: number;
}`;

const httpBodyValidation = `import { Body, Controller, Post } from '@nl-framework/http';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('/users')
export class UsersController {
  @Post('/')
  create(@Body() payload: CreateUserDto) {
    // Payload is already a CreateUserDto instance; unknown keys are stripped
    return this.service.register(payload);
  }

  constructor(private readonly service: UsersService) {}
}`;

const validationPipeUsage = `import { Body, Controller, Put, UsePipes, ValidationPipe } from '@nl-framework/http';
import { ApplicationException } from '@nl-framework/core';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('/users')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  skipMissingProperties: true, // friendly for PATCH-style updates
  groups: ['update'],
  exceptionFactory: (issues) => ApplicationException.validationError(
    'User payload invalid',
    { issues },
  ),
}))
export class UsersController {
  @Put('/:id')
  update(@Body() payload: UpdateUserDto) {
    return this.service.update(payload);
  }
}`;

const graphqlValidation = `import { Resolver, Mutation, Arg, InputType, Field, Int } from '@nl-framework/graphql';
import { IsEmail, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
class UpdateProfileInput {
  @Field()
  @IsString()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  visits?: number;
}

@Resolver()
export class ProfileResolver {
  @Mutation(() => Boolean)
  updateProfile(@Arg('input', () => UpdateProfileInput) input: UpdateProfileInput) {
    // input arrives as a sanitized UpdateProfileInput instance
    return true;
  }
}`;

const manualValidation = `import { transformAndValidate } from '@nl-framework/core';
import { ImportRowDto } from './dto/import-row.dto';

export async function normalizeRow(raw: unknown) {
  return transformAndValidate({
    metatype: ImportRowDto,
    value: raw,
    sanitize: true,
    validatorOptions: {
      forbidUnknownValues: true,
      groups: ['import'],
    },
  });
}

export async function validateBatch(rows: unknown[]) {
  return Promise.all(rows.map((row) => normalizeRow(row)));
}`;

export const metadata: Metadata = {
  title: "Validation · Techniques",
  description: "Validate and transform incoming data with class-validator and class-transformer across HTTP and GraphQL in Nael applications.",
};

export default function ValidationTechniquesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50">
          Techniques
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Validation</h1>
        <p className="text-lg text-muted-foreground">
          Nael leans on <code>class-validator</code> and <code>class-transformer</code> to keep payloads predictable.
          Define DTOs once and reuse them across HTTP controllers and GraphQL resolvers while the framework handles
          conversion, whitelisting, and user-friendly error responses.
        </p>
      </div>

      <section className="space-y-4" id="dtos">
        <h2 className="text-2xl font-semibold">Annotate DTOs</h2>
        <p className="text-muted-foreground">
          Decorate classes with validation rules and optional transformation hints. Nael calls <code>class-transformer</code>{' '}
          with <code>enableImplicitConversion</code> and <code>exposeDefaultValues</code> enabled, so strings like
          <code>&quot;5&quot;</code> can hydrate numeric fields and defaults populate when values are missing.
        </p>
        <CodeBlock code={dtoExample} title="create-user.dto.ts" />
      </section>

      <section className="space-y-4" id="http">
        <h2 className="text-2xl font-semibold">HTTP bodies validate automatically</h2>
        <p className="text-muted-foreground">
          Any <code>@Body()</code> parameter typed as a class triggers transformation + validation before your controller
          runs. Payloads are converted into class instances, unknown properties are stripped (<code>whitelist</code> on),
          and invalid data returns a 400 response shaped as <code>{'{ message, issues }'}</code>.
        </p>
        <CodeBlock code={httpBodyValidation} title="users.controller.ts" />
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Heads up:</strong> Automatic validation only kicks in for class metatypes (not primitives or plain arrays).
            For array payloads or bespoke parsing, loop through items with <code>transformAndValidate</code> or a custom pipe
            before persisting them.
          </p>
        </div>
      </section>

      <section className="space-y-4" id="pipes">
        <h2 className="text-2xl font-semibold">Fine-tune with pipes</h2>
        <p className="text-muted-foreground">
          Attach <code>ValidationPipe</code> when you need group-specific rules, to tolerate partial updates with{' '}
          <code>skipMissingProperties</code>, or to throw a custom <code>ApplicationException</code>. Pipes run after the
          framework&apos;s built-in body sanitization and are ideal for query params, headers, or custom decorators that also
          carry DTOs.
        </p>
        <CodeBlock code={validationPipeUsage} title="users.controller.ts" />
        <p className="text-sm text-muted-foreground">
          Combine with parsing pipes (like <code>ParseIntPipe</code> or <code>ParseBoolPipe</code>) to coerce primitives
          before validation executes.
        </p>
      </section>

      <section className="space-y-4" id="graphql">
        <h2 className="text-2xl font-semibold">GraphQL arguments are sanitized</h2>
        <p className="text-muted-foreground">
          Resolver params backed by <code>@InputType()</code> classes are transformed and validated automatically. Arrays
          of input types are supported when you describe the element type in the argument decorator. Failures surface as
          <code>BAD_USER_INPUT</code> errors with <code>extensions.validation</code> mirroring the HTTP <code>issues</code> format.
        </p>
        <CodeBlock code={graphqlValidation} title="profile.resolver.ts" />
      </section>

      <section className="space-y-4" id="utility">
        <h2 className="text-2xl font-semibold">Reuse the utility anywhere</h2>
        <p className="text-muted-foreground">
          Reach for <code>transformAndValidate</code> from <code>@nl-framework/core</code> in background jobs, CLI scripts,
          microservices, or array-processing endpoints. It returns typed instances or throws <code>ValidationException</code>{' '}
          with a concise <code>issues</code> list you can map to your own error model.
        </p>
        <CodeBlock code={manualValidation} title="transform-and-validate.ts" />
      </section>

      <section className="space-y-3" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Share DTO classes between HTTP and GraphQL to keep validation rules consistent.</li>
          <li>Use <code>@Type()</code> from <code>class-transformer</code> for nested objects, dates, and arrays to avoid ambiguous conversions.</li>
          <li>Bubble <code>ValidationException</code> details into <code>ApplicationException.validationError</code> when you need transport-agnostic errors.</li>
          <li>Keep validators close to the domain; treat DTOs as the contract boundary rather than sprinkling checks inside controllers.</li>
          <li>Log invalid payloads carefully—strip secrets before logging since validation runs before guards or interceptors.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          See <Link className="text-primary underline" href="/docs/pipes">Pipes</Link> for more on composing transformations,
          or explore <Link className="text-primary underline" href="/docs/graphql/exception-handling">GraphQL exception handling</Link>{' '}
          to customize the error surface.
        </p>
      </section>
    </article>
  );
}
