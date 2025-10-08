import CronExpressionParser from 'cron-parser';

type CronExpression = {
  next(): { toDate(): Date };
};

const parseCronExpression = (
  CronExpressionParser as unknown as {
    parse: (expression: string, options?: Record<string, unknown>) => CronExpression;
  }
).parse.bind(CronExpressionParser);
import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  WorkerTask,
  WorkerCronTask,
  WorkerIntervalTask,
  WorkerTimeoutTask,
} from './worker-types';

const activeTasks = new Map<string, { cancel(): void }>();

const post = (message: WorkerOutboundMessage) => {
  postMessage(message);
};

type TimerHandle = ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;

const scheduleCronTask = (task: WorkerCronTask) => {
  let timer: TimerHandle | undefined;
  let runs = 0;

  const scheduleNext = () => {
    if (task.maxRuns !== undefined && runs >= task.maxRuns) {
      return;
    }

    try {
      const expression = parseCronExpression(task.cron, {
        tz: task.timezone,
        currentDate: new Date(Date.now() + 20),
      });
      const next = expression.next().toDate();
      const delay = Math.max(0, next.getTime() - Date.now());
      timer = setTimeout(() => {
        runs += 1;
        post({ action: 'execute', id: task.id });
        scheduleNext();
      }, delay);
    } catch (error) {
      post({
        action: 'error',
        id: task.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  scheduleNext();

  return {
    cancel: () => {
      if (timer) {
        clearTimeout(timer as ReturnType<typeof setTimeout>);
      }
    },
  };
};

const scheduleIntervalTask = (task: WorkerIntervalTask) => {
  let runs = 0;
  const handle = setInterval(() => {
    runs += 1;
    post({ action: 'execute', id: task.id });
    if (task.maxRuns !== undefined && runs >= task.maxRuns) {
      clearInterval(handle);
    }
  }, task.interval);

  return {
    cancel: () => {
      clearInterval(handle);
    },
  };
};

const scheduleTimeoutTask = (task: WorkerTimeoutTask) => {
  const handle = setTimeout(() => {
    post({ action: 'execute', id: task.id });
  }, task.timeout);

  return {
    cancel: () => {
      clearTimeout(handle);
    },
  };
};

const registerTask = (task: WorkerTask) => {
  const existing = activeTasks.get(task.id);
  if (existing) {
    existing.cancel();
    activeTasks.delete(task.id);
  }

  let active;
  switch (task.type) {
    case 'cron':
      active = scheduleCronTask(task);
      break;
    case 'interval':
      active = scheduleIntervalTask(task);
      break;
    case 'timeout':
      active = scheduleTimeoutTask(task);
      break;
  }

  activeTasks.set(task.id, active);
  post({ action: 'ack', id: task.id });
};

const cancelTask = (id: string) => {
  const task = activeTasks.get(id);
  if (!task) {
    return;
  }

  task.cancel();
  activeTasks.delete(id);
  post({ action: 'ack', id });
};

const disposeAll = () => {
  for (const task of activeTasks.values()) {
    task.cancel();
  }

  activeTasks.clear();
  post({ action: 'ack' });
};

addEventListener('message', (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;
  switch (message.action) {
    case 'register':
      registerTask(message.task);
      break;
    case 'cancel':
      cancelTask(message.id);
      break;
    case 'dispose':
      disposeAll();
      close();
      break;
    default:
      post({
        action: 'error',
        error: `Unknown command: ${(message as { action?: string }).action ?? 'unknown'}`,
      });
  }
});
