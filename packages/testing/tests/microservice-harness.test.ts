import { describe, expect, it } from 'bun:test';
import { Injectable, Module } from '@nl-framework/core';
import { MessagePattern, EventPattern } from '@nl-framework/microservices';
import { Test } from '../src';

const receivedEvents: Array<{ value: number }> = [];

@Injectable()
class MathService {
  double(value: number): number {
    return value * 2;
  }
}

@Injectable()
class MathController {
  constructor(private readonly math: MathService) {}

  @MessagePattern('math.double')
  double(data: { value: number }): number {
    return this.math.double(data.value);
  }

  @EventPattern('math.logged')
  logged(data: { value: number }): void {
    receivedEvents.push(data);
  }
}

@Module({
  providers: [MathService],
  controllers: [MathController],
})
class MathModule {}

describe('MicroserviceHarness', () => {
  it('drives message handlers in-memory with send()', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [MathModule] }).compile();
    const harness = await moduleRef.createMicroserviceHarness();

    const result = await harness.send<number>('math.double', { value: 21 });
    expect(result).toBe(42);

    await moduleRef.close();
  });

  it('drives event handlers with emit() and discards the result', async () => {
    receivedEvents.length = 0;
    const moduleRef = await Test.createTestingModule({ imports: [MathModule] }).compile();
    const harness = await moduleRef.createMicroserviceHarness();

    const result = await harness.emit('math.logged', { value: 5 });
    expect(result).toBeUndefined();
    expect(receivedEvents).toEqual([{ value: 5 }]);

    await moduleRef.close();
  });

  it('routes handler dependencies through overridden providers', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [MathModule] })
      .overrideProvider(MathService)
      .useValue({ double: (value: number) => value + 1 })
      .compile();

    const harness = await moduleRef.createMicroserviceHarness();

    const result = await harness.send<number>('math.double', { value: 10 });
    expect(result).toBe(11);

    await moduleRef.close();
  });
});
