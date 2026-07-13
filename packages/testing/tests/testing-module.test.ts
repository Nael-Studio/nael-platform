import { describe, expect, it } from 'bun:test';
import {
  Inject,
  Injectable,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nl-framework/core';
import { Test } from '../src';

@Injectable()
class GreetingService {
  greet(name: string): string {
    return `Hello ${name}`;
  }
}

@Injectable()
class GreetingConsumer {
  constructor(private readonly service: GreetingService) {}

  run(): string {
    return this.service.greet('world');
  }
}

const CONFIG_TOKEN = Symbol.for('testing:config');

@Module({
  providers: [
    GreetingService,
    GreetingConsumer,
    { provide: CONFIG_TOKEN, useValue: { mode: 'real' } },
  ],
})
class GreetingModule {}

describe('TestingModuleBuilder', () => {
  it('resolves providers with the real implementation by default', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [GreetingModule] }).compile();

    const consumer = await moduleRef.get(GreetingConsumer);
    expect(consumer.run()).toBe('Hello world');

    await moduleRef.close();
  });

  it('applies overrideProvider().useValue() before instantiation so dependents receive the mock', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [GreetingModule] })
      .overrideProvider(GreetingService)
      .useValue({ greet: (name: string) => `Mocked ${name}` })
      .compile();

    const consumer = await moduleRef.get(GreetingConsumer);
    // The downstream injector (GreetingConsumer) must have been constructed with the mock.
    expect(consumer.run()).toBe('Mocked world');

    await moduleRef.close();
  });

  it('supports token overrides via useFactory', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [GreetingModule] })
      .overrideProvider(CONFIG_TOKEN)
      .useFactory({ factory: () => ({ mode: 'test' }) })
      .compile();

    expect(await moduleRef.get<{ mode: string }>(CONFIG_TOKEN)).toEqual({ mode: 'test' });

    await moduleRef.close();
  });

  it('supports useClass overrides', async () => {
    @Injectable()
    class FakeGreetingService {
      greet(name: string): string {
        return `Fake ${name}`;
      }
    }

    const moduleRef = await Test.createTestingModule({ imports: [GreetingModule] })
      .overrideProvider(GreetingService)
      .useClass(FakeGreetingService)
      .compile();

    const consumer = await moduleRef.get(GreetingConsumer);
    expect(consumer.run()).toBe('Fake world');

    await moduleRef.close();
  });

  it('runs the shutdown lifecycle on close()', async () => {
    const events: string[] = [];

    @Injectable()
    class LifecycleService implements OnModuleInit, OnModuleDestroy {
      onModuleInit(): void {
        events.push('init');
      }

      onModuleDestroy(): void {
        events.push('destroy');
      }
    }

    @Module({ providers: [LifecycleService], bootstrap: [LifecycleService] })
    class LifecycleModule {}

    const moduleRef = await Test.createTestingModule({ imports: [LifecycleModule] }).compile();
    expect(events).toEqual(['init']);

    await moduleRef.close();
    expect(events).toEqual(['init', 'destroy']);
  });

  it('injects tokens declared via inject option in useFactory overrides', async () => {
    const NAME_TOKEN = Symbol.for('testing:name');

    @Injectable()
    class Personalized {
      constructor(@Inject(NAME_TOKEN) readonly name: string) {}
    }

    @Module({
      providers: [{ provide: NAME_TOKEN, useValue: 'original' }, Personalized],
    })
    class PersonalizedModule {}

    const moduleRef = await Test.createTestingModule({ imports: [PersonalizedModule] })
      .overrideProvider(NAME_TOKEN)
      .useFactory({ factory: () => 'overridden' })
      .compile();

    const personalized = await moduleRef.get(Personalized);
    expect(personalized.name).toBe('overridden');

    await moduleRef.close();
  });
});
