import { beforeEach, describe, expect, it } from 'bun:test';
import { Injectable, Module, type ClassType } from '@nl-framework/core';
import {
  ObjectType,
  Field,
  Resolver,
  Query,
  Args,
  Int,
  GraphqlMetadataStorage,
  clearGraphqlGuards,
  clearGraphqlInterceptors,
  clearGraphQLExceptionFilters,
} from '@nl-framework/graphql';
import { Test } from '../src';

// Types are declared inside a factory (not at module scope) because the GraphQL
// metadata storage is a process-global singleton that other test files clear in
// their hooks — re-declaring per test keeps this suite order-independent.
const createReportModule = (): { module: ClassType; ReportService: ClassType } => {
  @ObjectType()
  class Report {
    @Field()
    message!: string;

    @Field(() => Int)
    score!: number;
  }

  @Injectable()
  class ReportService {
    build(score: number): Report {
      return { message: 'live', score };
    }
  }

  @Resolver(() => Report)
  class ReportResolver {
    constructor(private readonly service: ReportService) {}

    @Query(() => Report)
    report(@Args('score', () => Int) score: number): Report {
      return this.service.build(score);
    }
  }

  @Module({
    providers: [ReportService, ReportResolver],
    resolvers: [ReportResolver],
  })
  class ReportModule {}

  return { module: ReportModule, ReportService };
};

describe('GraphqlTestClient', () => {
  // The schema metadata storage and the global guard/interceptor/filter
  // registries are process-global singletons shared across every test file;
  // reset them so this suite is independent of run order (otherwise a global
  // guard leaked by another package's tests would run against these resolvers).
  beforeEach(() => {
    GraphqlMetadataStorage.get().clear();
    clearGraphqlGuards();
    clearGraphqlInterceptors();
    clearGraphQLExceptionFilters();
  });

  it('executes an operation in-process against the resolver', async () => {
    const { module } = createReportModule();
    const moduleRef = await Test.createTestingModule({ imports: [module] }).compile();
    const gql = await moduleRef.createGraphqlApplication();

    const result = await gql.execute<{ report: { message: string; score: number } }>({
      query: /* GraphQL */ `
        query Report($score: Int!) {
          report(score: $score) {
            message
            score
          }
        }
      `,
      variables: { score: 7 },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.report).toEqual({ message: 'live', score: 7 });

    await moduleRef.close();
  });

  it('routes resolver dependencies through overridden providers', async () => {
    const { module, ReportService } = createReportModule();
    const moduleRef = await Test.createTestingModule({ imports: [module] })
      .overrideProvider(ReportService)
      .useValue({ build: (score: number) => ({ message: 'mocked', score: score * 2 }) })
      .compile();

    const gql = await moduleRef.createGraphqlApplication();

    const result = await gql.execute<{ report: { message: string; score: number } }>({
      query: /* GraphQL */ `
        query {
          report(score: 5) {
            message
            score
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.report).toEqual({ message: 'mocked', score: 10 });

    await moduleRef.close();
  });
});
