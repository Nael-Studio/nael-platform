import type { ScheduleType } from './types';

interface WorkerTaskBase {
  id: string;
  type: ScheduleType;
  maxRuns?: number;
}

export interface WorkerCronTask extends WorkerTaskBase {
  type: 'cron';
  cron: string;
  timezone?: string;
}

export interface WorkerIntervalTask extends WorkerTaskBase {
  type: 'interval';
  interval: number;
}

export interface WorkerTimeoutTask extends WorkerTaskBase {
  type: 'timeout';
  timeout: number;
}

export type WorkerTask = WorkerCronTask | WorkerIntervalTask | WorkerTimeoutTask;

export interface RegisterTaskCommand {
  action: 'register';
  task: WorkerTask;
}

export interface CancelTaskCommand {
  action: 'cancel';
  id: string;
}

export interface DisposeCommand {
  action: 'dispose';
}

export type WorkerInboundMessage = RegisterTaskCommand | CancelTaskCommand | DisposeCommand;

export interface ExecuteTaskMessage {
  action: 'execute';
  id: string;
}

export interface ErrorMessage {
  action: 'error';
  id?: string;
  error: string;
  stack?: string;
}

export interface AckMessage {
  action: 'ack';
  id?: string;
}

export type WorkerOutboundMessage = ExecuteTaskMessage | ErrorMessage | AckMessage;
