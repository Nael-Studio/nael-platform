import { describe, expect, it } from 'bun:test';
import { Controller, Injectable, Module } from '@nl-framework/core';
import { Get, Post, Body, Param, UseGuards, type CanActivate, type HttpExecutionContext } from '@nl-framework/http';
import type { RequestContext } from '@nl-framework/http';
import { Test } from '../src';

@Injectable()
class UserService {
  private readonly users = new Map<string, { id: string; name: string }>([
    ['42', { id: '42', name: 'Ada' }],
  ]);

  find(id: string): { id: string; name: string } | undefined {
    return this.users.get(id);
  }

  create(name: string): { id: string; name: string } {
    const id = String(this.users.size + 100);
    const user = { id, name };
    this.users.set(id, user);
    return user;
  }
}

@Injectable()
class AuthGuard implements CanActivate {
  canActivate(context: HttpExecutionContext): boolean {
    return context.getRequest().headers.get('x-token') === 'secret';
  }
}

@UseGuards(AuthGuard)
@Controller('/users')
class UserController {
  constructor(private readonly service: UserService) {}

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.service.find(id) ?? { error: 'not found' };
  }

  @Post('/')
  create(@Body('name') name: string) {
    return this.service.create(name);
  }
}

@Module({
  providers: [UserService, AuthGuard],
  controllers: [UserController],
})
class UserModule {}

describe('HttpTestClient', () => {
  it('dispatches requests through the pipeline without binding a port', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [UserModule] })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const app = await moduleRef.createHttpApplication();

    const res = await app.requestJson<{ id: string; name: string }>('/users/42');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: '42', name: 'Ada' });

    await moduleRef.close();
  });

  it('enforces the real guard when it is not overridden', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [UserModule] }).compile();
    const app = await moduleRef.createHttpApplication();

    const denied = await app.request('/users/42');
    expect(denied.status).toBe(403);

    const allowed = await app.request('/users/42', { headers: { 'x-token': 'secret' } });
    expect(allowed.status).toBe(200);

    await moduleRef.close();
  });

  it('sends JSON bodies and receives the overridden service response', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [UserModule] })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(UserService)
      .useValue({
        find: () => undefined,
        create: (name: string) => ({ id: 'mock', name }),
      })
      .compile();

    const app = await moduleRef.createHttpApplication();

    const res = await app.requestJson<{ id: string; name: string }>('/users', {
      method: 'POST',
      json: { name: 'Grace' },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'mock', name: 'Grace' });

    await moduleRef.close();
  });
});
