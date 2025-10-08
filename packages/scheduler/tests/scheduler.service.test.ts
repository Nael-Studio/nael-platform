import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Logger } from '@nl-framework/logger';
import { SchedulerRegistry } from '../src/scheduler.registry';
import { SchedulerService } from '../src/scheduler.service';
import type { SchedulerWorker, SchedulerWorkerFactory } from '../src/worker-factory';
import type { WorkerInboundMessage, WorkerOutboundMessage } from '../src/worker-types';
import { Interval, Timeout } from '../src/decorators';

class TestWorker implements SchedulerWorker {
  private readonly messageHandlers = new Set<(event: MessageEvent<WorkerOutboundMessage>) => void>();
  private readonly errorHandlers = new Set<(event: ErrorEvent) => void>();
  public readonly messages: WorkerInboundMessage[] = [];
  public terminated = false;

  postMessage(message: WorkerInboundMessage): void {
    this.messages.push(message);
    switch (message.action) {
      case 'register':
        this.dispatch({ action: 'ack', id: message.task.id });
        break;
      case 'cancel':
        this.dispatch({ action: 'ack', id: message.id });
        break;
      case 'dispose':
        this.dispatch({ action: 'ack' });
        break;
    }
  }

  addEventListener(type: 'message', handler: (event: MessageEvent<WorkerOutboundMessage>) => void): void;
  addEventListener(type: 'error', handler: (event: ErrorEvent) => void): void;
  addEventListener(
    type: 'message' | 'error',
    handler: ((event: MessageEvent<WorkerOutboundMessage>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.messageHandlers.add(handler as (event: MessageEvent<WorkerOutboundMessage>) => void);
    } else {
      this.errorHandlers.add(handler as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(type: 'message', handler: (event: MessageEvent<WorkerOutboundMessage>) => void): void;
  removeEventListener(type: 'error', handler: (event: ErrorEvent) => void): void;
  removeEventListener(
    type: 'message' | 'error',
    handler: ((event: MessageEvent<WorkerOutboundMessage>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.messageHandlers.delete(handler as (event: MessageEvent<WorkerOutboundMessage>) => void);
    } else {
      this.errorHandlers.delete(handler as (event: ErrorEvent) => void);
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  emitExecute(id: string): void {
    this.dispatch({ action: 'execute', id });
  }

  private dispatch(message: WorkerOutboundMessage): void {
    const event = { data: message } as MessageEvent<WorkerOutboundMessage>;
    for (const handler of this.messageHandlers) {
      handler(event);
    }
  }
}

describe('SchedulerService', () => {
  let registry: SchedulerRegistry;
  let logger: Logger;
  let worker: TestWorker;
  let service: SchedulerService;

  beforeEach(() => {
    registry = new SchedulerRegistry();
    logger = new Logger({ level: 'FATAL' });
    worker = new TestWorker();
    const factory: SchedulerWorkerFactory = {
      create: () => worker,
    };
    service = new SchedulerService(registry, logger, factory);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('registers decorated targets and executes handlers', async () => {
    class Demo {
      count = 0;

      @Interval(1000)
      tick(): void {
        this.count += 1;
      }
    }

    const demo = new Demo();
    await service.registerDecoratedTarget(demo);

    worker.emitExecute('Demo#tick');
    expect(demo.count).toBe(1);

    const handle = registry.getIntervals().get('Demo#tick');
    expect(handle).toBeDefined();
  });

  it('supports runOnInit for decorated handlers', async () => {
    class RunOnInit {
      count = 0;

      @Timeout(100, { runOnInit: true })
      run(): void {
        this.count += 1;
      }
    }

    const run = new RunOnInit();
    await service.registerDecoratedTarget(run);

    await Promise.resolve();
    await Promise.resolve();

    expect(run.count).toBe(1);
  });

  it('cancels tasks via registry handles', async () => {
    class Cancelable {
      count = 0;

      @Interval(1000, { name: 'custom' })
      tick(): void {
        this.count += 1;
      }
    }

    const instance = new Cancelable();
    await service.registerDecoratedTarget(instance);

    const handle = registry.getIntervals().get('custom');
    expect(handle).toBeDefined();

    await service.cancel('custom');
    expect(worker.messages.some((m) => m.action === 'cancel' && m.id === 'custom')).toBe(true);
  });
});
