declare module 'cron-parser' {
  export interface CronDate {
    toDate(): Date;
  }

  export interface CronIterator {
    next(): CronDate;
  }

  export interface ParserOptions {
    tz?: string;
    currentDate?: string | number | Date;
  }

  export function parseExpression(expression: string, options?: ParserOptions): CronIterator;
}
