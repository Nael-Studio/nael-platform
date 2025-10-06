import type { ExampleCatalogEntry } from '../../types';

export const httpExamples: ExampleCatalogEntry[] = [
  {
    id: 'http-basic-crud',
    category: 'http',
    title: 'RESTful CRUD Controller',
    description: 'Implements a REST controller with CRUD endpoints, DTO validation, and structured responses.',
    code: `import { Controller, Get, Post, Put, Delete, Param, Body } from '@nl-framework/http';
import { Injectable, Module } from '@nl-framework/core';

interface CreateTodoDto {
  title: string;
  completed?: boolean;
}

@Injectable()
class TodosService {
  private readonly todos = new Map<string, { id: string; title: string; completed: boolean }>();

  list() {
    return Array.from(this.todos.values());
  }

  find(id: string) {
    return this.todos.get(id);
  }

  create(payload: CreateTodoDto) {
    const id = crypto.randomUUID();
    const todo = { id, title: payload.title, completed: payload.completed ?? false };
    this.todos.set(id, todo);
    return todo;
  }

  update(id: string, payload: CreateTodoDto) {
    const existing = this.todos.get(id);
    if (!existing) throw new Error('Not found');
    const next = { ...existing, ...payload };
    this.todos.set(id, next);
    return next;
  }

  remove(id: string) {
    return this.todos.delete(id);
  }
}

@Controller('/todos')
class TodosController {
  constructor(private readonly service: TodosService) {}

  @Get('/')
  list() {
    return this.service.list();
  }

  @Get('/:id')
  find(@Param('id') id: string) {
    return this.service.find(id);
  }

  @Post('/')
  create(@Body() payload: CreateTodoDto) {
    return this.service.create(payload);
  }

  @Put('/:id')
  update(@Param('id') id: string, @Body() payload: CreateTodoDto) {
    return this.service.update(id, payload);
  }

  @Delete('/:id')
  remove(@Param('id') id: string) {
    return { deleted: this.service.remove(id) };
  }
}

@Module({ controllers: [TodosController], providers: [TodosService] })
export class TodosModule {}
`,
    explanation: 'Use this module with the platform HTTP bootstrapper to expose `/todos` endpoints.',
    tags: ['http', 'controller', 'crud'],
    relatedPackages: ['@nl-framework/http', '@nl-framework/core', '@nl-framework/platform'],
  },
  {
    id: 'http-guard-pipeline',
    category: 'http',
    title: 'Authentication Guard Pipeline',
    description: 'Combine global middleware and route-level guards to protect sensitive endpoints.',
    code: `import { Controller, Get, UseGuards } from '@nl-framework/http';
import { SessionGuard } from '@nl-framework/auth';

@Controller('/me')
@UseGuards(SessionGuard)
export class MeController {
  @Get('/')
  profile(context: RequestContext) {
    return context.user;
  }
}
`,
    tags: ['http', 'auth'],
    relatedPackages: ['@nl-framework/auth'],
  },
];
