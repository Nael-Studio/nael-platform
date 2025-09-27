import { bold, cyan, dim, gray, magenta, red, yellow, green } from 'colorette';
import type { LoggerTransport, LogMessage } from '../types';
import type { LogLevelKey } from '../log-level';
import { LogLevelOrder } from '../log-level';

const MAX_LEVEL_LENGTH = LogLevelOrder.reduce((max, level) => Math.max(max, level.length), 0);

const LEVEL_PALETTE: Record<LogLevelKey, (value: string) => string> = {
  FATAL: (value) => red(bold(value)),
  ERROR: (value) => red(value),
  WARN: (value) => yellow(value),
  INFO: (value) => green(value),
  DEBUG: (value) => magenta(value),
  VERBOSE: (value) => cyan(value),
};

const formatTimestamp = (date: Date): string =>
  dim(date.toISOString().split('T')[1]?.replace('Z', '') ?? date.toISOString());

const defaultFormat = (entry: LogMessage): string => {
  const levelLabel = entry.level.padEnd(MAX_LEVEL_LENGTH, ' ');
  const level = LEVEL_PALETTE[entry.level](levelLabel);
  const context = entry.context ? cyan(`[${entry.context}]`) : undefined;
  const message = bold(entry.message);

  const baseLine = [formatTimestamp(entry.timestamp), level, context, message]
    .filter(Boolean)
    .join(' ');

  const metaLine = entry.meta && Object.keys(entry.meta).length > 0 ? gray(JSON.stringify(entry.meta)) : undefined;

  let errorLine: string | undefined;
  if (entry.error instanceof Error) {
    errorLine = red(entry.error.stack ?? entry.error.message);
  } else if (entry.error !== undefined) {
    errorLine = red(String(entry.error));
  }

  return [baseLine, metaLine, errorLine].filter(Boolean).join('\n');
};

export class ConsoleTransport implements LoggerTransport {
  constructor(private readonly formatter: (entry: LogMessage) => string = defaultFormat) {}

  log(entry: LogMessage): void {
    const formatted = this.formatter(entry);
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      console.error(formatted);
      return;
    }
    if (entry.level === 'WARN') {
      console.warn(formatted);
      return;
    }
    console.log(formatted);
  }
}
