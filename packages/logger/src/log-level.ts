export const LogLevel = {
  FATAL: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  VERBOSE: 5,
} as const;

export type LogLevelKey = keyof typeof LogLevel;

export const LogLevelOrder: LogLevelKey[] = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'];
