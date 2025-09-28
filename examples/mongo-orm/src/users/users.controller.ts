import { Controller } from '@nl-framework/core';
import { Delete, Get, Post, type RequestContext } from '@nl-framework/http';
import { UsersService, type CreateUserInput } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(ctx: RequestContext) {
    const withDeleted = ctx.query.get('withDeleted') === 'true';
    return this.users.findAll(withDeleted);
  }

  @Get(':id')
  async getOne(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return this.json({ message: 'Parameter "id" is required' }, 400);
    }

    const withDeleted = ctx.query.get('withDeleted') === 'true';
    const entity = await this.users.findOne(id, withDeleted);

    if (!entity) {
      return this.json({ message: 'User not found' }, 404);
    }

    return entity;
  }

  @Post()
  async create(ctx: RequestContext) {
    const payload = (ctx.body ?? {}) as Partial<CreateUserInput>;

    if (!payload.email || !payload.name) {
      return this.json({ message: 'Both "email" and "name" are required.' }, 400);
    }

    const entity = await this.users.create({
      email: payload.email,
      name: payload.name,
      role: payload.role,
    });

    return entity;
  }

  @Delete(':id')
  async remove(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return this.json({ message: 'Parameter "id" is required' }, 400);
    }

    const removed = await this.users.softDelete(id);

    if (!removed) {
      return this.json({ message: 'User not found' }, 404);
    }

    return this.json({ message: 'User archived via soft delete' });
  }

  @Post(':id/restore')
  async restore(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return this.json({ message: 'Parameter "id" is required' }, 400);
    }

    const restored = await this.users.restore(id);

    if (!restored) {
      return this.json({ message: 'User not found or already active' }, 404);
    }

    const entity = await this.users.findOne(id, true);
    return entity ?? this.json({ message: 'User restored but fetch failed' }, 500);
  }

  private json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
