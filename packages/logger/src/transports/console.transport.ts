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

const formatPrimitive = (value: unknown): string => {
  if (value === null) {
    return gray('null');
  }

  if (value === undefined) {
    return gray('undefined');
  }

  if (value instanceof Date) {
    return cyan(value.toISOString());
  }

  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
      return yellow(String(value));
    case 'boolean':
      return value ? green('true') : red('false');
    case 'bigint':
      return yellow(`${value}n`);
    case 'symbol':
      return magenta(String(value));
    case 'object': {
      const entries = Object.entries(value as Record<string, unknown>);
      if (!entries.length) {
        return gray('{}');
      }
      const formatted = entries
        .map(([key, nested]) => `${cyan(key)}=${formatPrimitive(nested)}`)
        .join(dim(', '));
      return `{ ${formatted} }`;
    }
    default:
      return String(value);
  }
};

const formatMeta = (meta: Record<string, unknown>): string => {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(meta)) {
    const label = dim(`${key}:`);

    if (Array.isArray(value)) {
      if (!value.length) {
        lines.push(`${label} ${gray('[]')}`);
        continue;
      }

      const objectEntries = value.every(
        (item) => item && typeof item === 'object' && !Array.isArray(item),
      );

      if (objectEntries) {
        lines.push(`${label}`);
        for (const item of value as Array<Record<string, unknown>>) {
          const formatted = Object.entries(item)
            .map(([nestedKey, nestedValue]) => `${cyan(nestedKey)}=${formatPrimitive(nestedValue)}`)
            .join(dim(', '));
          lines.push(`  • ${formatted}`);
        }
        continue;
      }

      const formatted = value
        .map((item) =>
          typeof item === 'object' && item !== null
            ? formatPrimitive(item)
            : formatPrimitive(item as unknown),
        )
        .join(dim(', '));
      lines.push(`${label} ${formatted}`);
      continue;
    }

    if (value && typeof value === 'object') {
      const formatted = Object.entries(value as Record<string, unknown>)
        .map(([nestedKey, nestedValue]) => `${cyan(nestedKey)}=${formatPrimitive(nestedValue)}`)
        .join(dim(', '));
      lines.push(`${label} ${formatted}`);
      continue;
    }

    lines.push(`${label} ${formatPrimitive(value)}`);
  }

  return lines.join('\n');
};

const defaultFormat = (entry: LogMessage): string => {
  const levelLabel = entry.level.padEnd(MAX_LEVEL_LENGTH, ' ');
  const level = LEVEL_PALETTE[entry.level](levelLabel);
  const context = entry.context ? cyan(`[${entry.context}]`) : undefined;
  const message = bold(entry.message);

  const baseLine = [formatTimestamp(entry.timestamp), level, context, message]
    .filter(Boolean)
    .join(' ');

  const metaLine =
    entry.meta && Object.keys(entry.meta).length > 0
      ? formatMeta(entry.meta)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')
      : undefined;

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
