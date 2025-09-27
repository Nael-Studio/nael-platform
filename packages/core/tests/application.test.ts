import { describe, expect, it } from 'bun:test';
import {
  Application,
  Injectable,
  Module,
  Controller,
  Inject,
  ConfigService,
} from '../src/index';

@Injectable()
class GreetingService {
  getGreeting() {
    return 'Hello';
  }
}

@Injectable()
class FarewellService {
  getFarewell() {
    return 'Goodbye';
  }
}

@Injectable()
class Greeter {
  constructor(private readonly greeting: GreetingService, private readonly farewell: FarewellService) {}

  compose(): string {
    return `${this.greeting.getGreeting()} & ${this.farewell.getFarewell()}`;
  }
}

@Controller('test')
class TestController {
  constructor(private readonly greeter: Greeter) {}

  message() {
    return this.greeter.compose();
  }
}

@Module({
  providers: [GreetingService, FarewellService, Greeter],
  controllers: [TestController],
})
class TestModule {}

describe('Application bootstrap', () => {
  it('registers providers and resolves dependencies', async () => {
    const app = new Application();
    const context = await app.bootstrap(TestModule, {
      config: {
        overrides: {
          app: {
            name: 'test-app',
          },
        },
      },
    });

    const greeter = await context.get(Greeter);
    expect(greeter.compose()).toBe('Hello & Goodbye');

  const controllers = context.getControllers<TestController>(TestModule);
    expect(controllers).toHaveLength(1);
    expect(controllers[0]?.message()).toBe('Hello & Goodbye');

    const config = context.getConfig<{
      app: { name: string };
    }>();

    expect(config.get<string>('app.name')).toBe('test-app');

    await context.close();
  });

  it('supports custom injection tokens', async () => {
    const TOKEN = Symbol('token');

    @Injectable()
    class TokenConsumer {
      constructor(@Inject(TOKEN) private readonly value: string) {}

      getValue() {
        return this.value;
      }
    }

    @Module({
      providers: [
        {
          provide: TOKEN,
          useValue: 'injected',
        },
        TokenConsumer,
      ],
    })
    class TokenModule {}

    const app = new Application();
    const context = await app.bootstrap(TokenModule);
    const consumer = await context.get(TokenConsumer);
    expect(consumer.getValue()).toBe('injected');
    await context.close();
  });
});
