import { Inject, Injectable, type OnModuleDestroy, type ClassType } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { SCHEDULER_WORKER_FACTORY } from './constants';
import { getSchedulerMetadata } from './metadata';
import {
  type SchedulerHandler,
  type CronOptions,
  type IntervalOptions,
  type TimeoutOptions,
  type SchedulerTaskMetadata,
  type ScheduledHandle,
} from './types';
import {
  type SchedulerWorker,
  type SchedulerWorkerFactory,
  type WorkerMessageHandler,
} from './worker-factory';
import type { WorkerInboundMessage, WorkerOutboundMessage, WorkerTask } from './worker-types';
import { SchedulerRegistry } from './scheduler.registry';

interface PendingAck {
  resolve(): void;
  reject(error: Error): void;
}

@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private worker: SchedulerWorker | undefined;
  private readonly handlers = new Map<string, SchedulerHandler>();
  private readonly pendingAcks = new Map<string, PendingAck>();
  private readonly messageHandler: WorkerMessageHandler;
  private readonly errorHandler: (event: ErrorEvent) => void;
  private disposed = false;

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly logger: Logger,
    @Inject(SCHEDULER_WORKER_FACTORY) private readonly workerFactory: SchedulerWorkerFactory,
  ) {
    this.messageHandler = (event) => this.onWorkerMessage(event.data as WorkerOutboundMessage);
    this.errorHandler = (event) => {
      const error = event.error ?? new Error(event.message);
      this.logger.error('Scheduler worker error', error instanceof Error ? error : undefined, {
        message: event.message,
      });
    };
  }

  async registerDecoratedTarget(target: object): Promise<void> {
    const ctor = (target as { constructor?: unknown }).constructor;
    if (typeof ctor !== 'function') {
      this.logger.warn('Attempted to register scheduler metadata on non-class instance');
      return;
    }

    const metadata = getSchedulerMetadata(ctor as ClassType);
    if (metadata.length === 0) {
      return;
    }

    for (const task of metadata) {
      await this.registerMetadata(target, task);
    }
  }

  async scheduleCron(name: string, handler: SchedulerHandler, options: CronOptions): Promise<ScheduledHandle> {
    return this.registerTask(
      {
        id: name,
        type: 'cron',
        cron: options.cron,
        timezone: options.timezone,
        maxRuns: options.maxRuns,
      },
      handler,
      options.runOnInit,
    );
  }

  async scheduleInterval(
    name: string,
    handler: SchedulerHandler,
    options: IntervalOptions,
  ): Promise<ScheduledHandle> {
    return this.registerTask(
      {
        id: name,
        type: 'interval',
        interval: options.interval,
        maxRuns: options.maxRuns,
      },
      handler,
      options.runOnInit,
    );
  }

  async scheduleTimeout(
    name: string,
    handler: SchedulerHandler,
    options: TimeoutOptions,
  ): Promise<ScheduledHandle> {
    return this.registerTask(
      {
        id: name,
        type: 'timeout',
        timeout: options.timeout,
        maxRuns: options.maxRuns,
      },
      handler,
      options.runOnInit,
    );
  }

  async cancel(id: string): Promise<void> {
    if (!this.handlers.has(id)) {
      return;
    }

    await this.sendCommand({ action: 'cancel', id }, id).catch((error) => {
      this.logger.error('Failed to cancel scheduled task', error, { id });
    });

    this.handlers.delete(id);
    this.registry.removeCronJob(id) || this.registry.removeInterval(id) || this.registry.removeTimeout(id);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    if (this.worker) {
      try {
        await this.sendCommand({ action: 'dispose' });
      } catch (error) {
        this.logger.warn('Failed to dispose scheduler worker gracefully', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      try {
        await this.worker.terminate();
      } catch (error) {
        this.logger.warn('Error terminating scheduler worker', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      this.worker.removeEventListener('message', this.messageHandler);
      this.worker.removeEventListener('error', this.errorHandler);
      this.worker = undefined;
    }

    this.registry.clear();
    this.handlers.clear();
    this.pendingAcks.clear();
  }

  private async registerMetadata(target: object, metadata: SchedulerTaskMetadata): Promise<void> {
    const instanceMethod = Reflect.get(target, metadata.propertyKey);
    if (typeof instanceMethod !== 'function') {
      this.logger.error('Scheduled method is not a function', undefined, {
        target: target.constructor?.name ?? 'AnonymousClass',
        propertyKey: metadata.propertyKey,
      });
      return;
    }

  const boundHandler = instanceMethod.bind(target) as SchedulerHandler;
  const defaultName = `${target.constructor?.name ?? 'AnonymousClass'}#${String(metadata.propertyKey)}`;
  const name = metadata.options.name ?? defaultName;

    switch (metadata.type) {
      case 'cron':
        await this.scheduleCron(name, boundHandler, metadata.options);
        break;
      case 'interval':
        await this.scheduleInterval(name, boundHandler, metadata.options);
        break;
      case 'timeout':
        await this.scheduleTimeout(name, boundHandler, metadata.options);
        break;
    }
  }

  private async registerTask(
    task: WorkerTask,
    handler: SchedulerHandler,
    runOnInit = false,
  ): Promise<ScheduledHandle> {
    if (this.handlers.has(task.id)) {
      throw new Error(`Task with id "${task.id}" already registered.`);
    }

    this.handlers.set(task.id, handler);

    try {
      await this.sendCommand({ action: 'register', task }, task.id);
    } catch (error) {
      this.handlers.delete(task.id);
      throw error;
    }

    const handle: ScheduledHandle = {
      id: task.id,
      type: task.type,
      cancel: () => {
        void this.cancel(task.id);
      },
    };

    switch (task.type) {
      case 'cron':
        this.registry.registerCronJob(task.id, handle);
        break;
      case 'interval':
        this.registry.registerInterval(task.id, handle);
        break;
      case 'timeout':
        this.registry.registerTimeout(task.id, handle);
        break;
    }

    if (runOnInit) {
      queueMicrotask(() => {
        void this.executeTask(task.id);
      });
    }

    return handle;
  }

  private async ensureWorker(): Promise<SchedulerWorker> {
    if (this.worker) {
      return this.worker;
    }

    const worker = this.workerFactory.create();
    worker.addEventListener('message', this.messageHandler);
    worker.addEventListener('error', this.errorHandler);
    this.worker = worker;
    return worker;
  }

  private async sendCommand(message: WorkerInboundMessage, ackId?: string): Promise<void> {
    const worker = await this.ensureWorker();

    if (ackId) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.pendingAcks.set(ackId, { resolve, reject });
          try {
            worker.postMessage(message);
          } catch (error) {
            this.pendingAcks.delete(ackId);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      } finally {
        this.pendingAcks.delete(ackId);
      }
      return;
    }

    worker.postMessage(message);
  }

  private async executeTask(id: string): Promise<void> {
    const handler = this.handlers.get(id);
    if (!handler) {
      this.logger.warn('Received execution for unknown task', { id });
      return;
    }

    try {
      await handler();
    } catch (error) {
      this.logger.error('Scheduled task execution failed', error, { id });
    }
  }

  private onWorkerMessage(message: WorkerOutboundMessage): void {
    switch (message.action) {
      case 'ack': {
        if (message.id) {
          const pending = this.pendingAcks.get(message.id);
          if (pending) {
            pending.resolve();
            this.pendingAcks.delete(message.id);
          }
        }
        break;
      }
      case 'error': {
        const pending = message.id ? this.pendingAcks.get(message.id) : undefined;
        if (pending) {
          pending.reject(new Error(message.error));
          this.pendingAcks.delete(message.id!);
        }
        this.logger.error('Scheduler worker reported error', undefined, {
          id: message.id,
          error: message.error,
          stack: message.stack,
        });
        break;
      }
      case 'execute': {
        void this.executeTask(message.id);
        break;
      }
    }
  }
}
