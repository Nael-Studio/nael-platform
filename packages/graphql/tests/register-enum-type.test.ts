import { beforeEach, describe, expect, it } from 'bun:test';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { registerEnumType } from '../src/register-enum-type';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query } from '../src/decorators/resolver';

beforeEach(() => {
  GraphqlMetadataStorage.get().clear();
});

describe('registerEnumType', () => {
  enum TaskStatus {
    Pending = 'PENDING',
    Active = 'ACTIVE',
    Archived = 'ARCHIVED_LEGACY',
  }

  it('emits enum SDL and resolver map for registered enums', () => {
    registerEnumType(TaskStatus, {
      name: 'TaskStatus',
      description: 'Workflow status for a task.',
      valuesMap: {
        Archived: {
          description: 'Old archived state kept for backwards compatibility.',
          deprecationReason: 'Use INACTIVE instead.',
          value: 'ARCHIVED',
        },
      },
    });

    @ObjectType()
    class Task {
      @Field(() => TaskStatus)
      status!: TaskStatus;
    }

    @Resolver(() => Task)
    class TaskResolver {
      @Query(() => Task)
      task(): Task {
        return { status: TaskStatus.Active } satisfies Task;
      }
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new TaskResolver()]);

    expect(artifacts.typeDefs).toContain('enum TaskStatus');
    expect(artifacts.typeDefs).toContain('  Archived @deprecated(reason: "Use INACTIVE instead.")');
    expect(artifacts.typeDefs).toContain('Workflow status for a task.');
    expect(artifacts.resolvers.TaskStatus).toEqual({
      Pending: 'PENDING',
      Active: 'ACTIVE',
      Archived: 'ARCHIVED',
    });
    expect(artifacts.resolvers.TaskStatus.Archived).toBe('ARCHIVED');
  });

  it('throws a helpful error when an enum is used without registration', () => {
    enum Severity {
      Low = 'LOW',
      High = 'HIGH',
    }

    @ObjectType()
    class Alarm {
      @Field(() => Severity)
      severity!: Severity;
    }

    @Resolver(() => Alarm)
    class AlarmResolver {
      @Query(() => Alarm)
      alarm(): Alarm {
        return { severity: Severity.Low } satisfies Alarm;
      }
    }

    const builder = new GraphqlSchemaBuilder();

    expect(() => builder.build([new AlarmResolver()])).toThrowError(
      /registerEnumType\(\) first/,
    );
  });
});
