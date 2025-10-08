import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nl-framework/core';
import { SCHEDULER_WORKER_FACTORY } from './constants';
import type { WorkerInboundMessage, WorkerOutboundMessage } from './worker-types';

export type WorkerMessageHandler = (event: MessageEvent<WorkerOutboundMessage>) => void;

export interface SchedulerWorker {
  postMessage(message: WorkerInboundMessage): void;
  addEventListener(type: 'message', handler: WorkerMessageHandler): void;
  addEventListener(type: 'error', handler: (event: ErrorEvent) => void): void;
  removeEventListener(type: 'message', handler: WorkerMessageHandler): void;
  removeEventListener(type: 'error', handler: (event: ErrorEvent) => void): void;
  terminate(): void | Promise<void>;
}

export interface SchedulerWorkerFactory {
  create(): SchedulerWorker;
}

const WORKER_CANDIDATES = ['./scheduler.worker.js', './scheduler.worker.ts'] as const;

const resolveWorkerUrl = (): URL => {
  for (const candidate of WORKER_CANDIDATES) {
    try {
      const url = new URL(candidate, import.meta.url);
      const path = fileURLToPath(url);
      if (existsSync(path)) {
        return url;
      }
    } catch {
      // ignore resolution errors
    }
  }

  throw new Error('Scheduler worker entrypoint could not be resolved.');
};

@Injectable()
export class DefaultSchedulerWorkerFactory implements SchedulerWorkerFactory {
  create(): SchedulerWorker {
    const url = resolveWorkerUrl();
    const worker = new Worker(url.href, {
      name: 'nl-scheduler',
      type: 'module',
    });

    return worker as unknown as SchedulerWorker;
  }
}

export const defaultSchedulerWorkerFactoryProvider = {
  provide: SCHEDULER_WORKER_FACTORY,
  useClass: DefaultSchedulerWorkerFactory,
};
