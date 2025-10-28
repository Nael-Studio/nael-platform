import { describe, it, expect } from 'bun:test';
import { Injectable } from '../src/decorators/injectable';
import { Inject } from '../src/decorators/inject';
import { Container } from '../src/container/container';
import type { ClassType } from '../src/interfaces/provider';
import { forwardRef } from '../src/interfaces/provider';

describe('forwardRef', () => {
  it('supports using forwardRef in @Inject to reference a token lazily', async () => {
    @Injectable()
    class ServiceB {
      get value(): string {
        return 'b';
      }
    }

    @Injectable()
    class ServiceA {
      constructor(@Inject(forwardRef(() => ServiceB)) public b: ServiceB) {}
    }

    const container = new Container();
    // Directly register providers by class
    container.registerProvider(ServiceA as unknown as ClassType);
    container.registerProvider(ServiceB as unknown as ClassType);

    const a = await container.resolve(ServiceA);
    expect(a).toBeInstanceOf(ServiceA);
    expect(a.b).toBeInstanceOf(ServiceB);
    expect(a.b.value).toBe('b');
  });

  it('throws a helpful error on true circular constructor dependencies', async () => {
    @Injectable()
    class Alpha {
      // Use an untyped parameter to avoid emitDecoratorMetadata touching Beta before it is declared
      constructor(@Inject(forwardRef(() => Beta)) public beta: any) {}
    }

    @Injectable()
    class Beta {
      constructor(public alpha: Alpha) {}
    }

    const container = new Container();
    container.registerProvider(Alpha as unknown as ClassType);
    container.registerProvider(Beta as unknown as ClassType);

    await expect(container.resolve(Alpha)).rejects.toThrow(/Circular dependency detected/);
  });
});
