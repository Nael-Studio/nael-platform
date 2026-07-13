import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Controller, Module } from '@nl-framework/core';
import { IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  DefaultValuePipe,
  Get,
  Param,
  ParseArrayPipe,
  ParseBoolPipe,
  ParseFloatPipe,
  ParseIntPipe,
  Query,
  UsePipes,
  ValidationPipe,
  type HttpApplication,
} from '../src/index';

const ORIGIN = 'http://pipes.local';

@Controller('/pipes')
class PipeController {
  @UsePipes(ParseIntPipe)
  @Get('/int/:value')
  int(@Param('value') value: number) {
    return { value, type: typeof value };
  }

  @UsePipes(ParseFloatPipe)
  @Get('/float/:value')
  float(@Param('value') value: number) {
    return { value, type: typeof value };
  }

  @UsePipes(ParseBoolPipe)
  @Get('/bool/:value')
  bool(@Param('value') value: boolean) {
    return { value, type: typeof value };
  }

  @UsePipes(new ParseArrayPipe({ separator: ',' }))
  @Get('/array')
  array(@Query('tags') tags: string[]) {
    return { tags };
  }

  @UsePipes(new ParseArrayPipe({ separator: ',', items: new ParseIntPipe() }))
  @Get('/array-int')
  arrayInt(@Query('nums') nums: number[]) {
    return { nums };
  }

  @UsePipes(new DefaultValuePipe('anonymous'))
  @Get('/default')
  withDefault(@Query('name') name: string) {
    return { name };
  }
}

@Module({ controllers: [PipeController] })
class PipeModule {}

describe('HTTP built-in pipes', () => {
  let app: HttpApplication | undefined;

  const dispatch = (path: string) => app!.handle(new Request(`${ORIGIN}${path}`));

  beforeEach(async () => {
    clearHttpRouteRegistrars();
    clearHttpGuards();
    clearHttpInterceptors();
    clearExceptionFilters();
    app = await createHttpApplication(PipeModule, { port: 0 });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('ParseIntPipe parses a valid integer and rejects a non-numeric one', async () => {
    const ok = await dispatch('/pipes/int/42');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ value: 42, type: 'number' });

    const bad = await dispatch('/pipes/int/abc');
    expect(bad.status).toBe(400);
    const body = (await bad.json()) as { statusCode: number; message: string };
    expect(body.statusCode).toBe(400);
    expect(body.message).toContain('numeric string expected');
  });

  it('ParseFloatPipe parses a decimal and rejects garbage', async () => {
    const ok = await dispatch('/pipes/float/3.14');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ value: 3.14, type: 'number' });

    const bad = await dispatch('/pipes/float/nope');
    expect(bad.status).toBe(400);
  });

  it('ParseBoolPipe parses booleans and rejects other strings', async () => {
    expect(await (await dispatch('/pipes/bool/true')).json()).toEqual({
      value: true,
      type: 'boolean',
    });
    expect(await (await dispatch('/pipes/bool/0')).json()).toEqual({
      value: false,
      type: 'boolean',
    });

    const bad = await dispatch('/pipes/bool/maybe');
    expect(bad.status).toBe(400);
  });

  it('ParseArrayPipe splits a delimited query value', async () => {
    const res = await dispatch('/pipes/array?tags=a,%20b%20,c');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tags: ['a', 'b', 'c'] });
  });

  it('ParseArrayPipe maps items through a nested pipe and surfaces its failure', async () => {
    const ok = await dispatch('/pipes/array-int?nums=1,2,3');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ nums: [1, 2, 3] });

    const bad = await dispatch('/pipes/array-int?nums=1,x,3');
    expect(bad.status).toBe(400);
  });

  it('DefaultValuePipe substitutes a default for a missing value', async () => {
    const missing = await dispatch('/pipes/default');
    expect(await missing.json()).toEqual({ name: 'anonymous' });

    const provided = await dispatch('/pipes/default?name=grace');
    expect(await provided.json()).toEqual({ name: 'grace' });
  });
});

class SignupDto {
  @IsString()
  email!: string;

  @IsInt()
  @Min(18)
  @Type(() => Number)
  age!: number;
}

describe('ValidationPipe (unit)', () => {
  it('transforms and returns a valid instance', async () => {
    const pipe = new ValidationPipe();
    const result = await pipe.transform(
      { email: 'ada@example.com', age: '21' },
      { type: 'body', metatype: SignupDto },
    );
    expect(result).toBeInstanceOf(SignupDto);
    expect(result).toEqual(
      expect.objectContaining({ email: 'ada@example.com', age: 21 }),
    );
  });

  it('throws an HttpException with the framework 400 shape on invalid input', async () => {
    const pipe = new ValidationPipe();
    const failure = pipe
      .transform({ email: 42, age: 'ten' }, { type: 'body', metatype: SignupDto })
      .then(
        () => {
          throw new Error('expected validation to fail');
        },
        (error: unknown) => error as { status?: number; message?: string },
      );

    const error = await failure;
    expect(error.status).toBe(400);
    expect(error.message).toContain('Validation failed');
  });

  it('passes primitive metatypes through untouched', async () => {
    const pipe = new ValidationPipe();
    const result = await pipe.transform('plain', { type: 'query', metatype: String });
    expect(result).toBe('plain');
  });
});
