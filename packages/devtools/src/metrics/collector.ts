export type SampleKind = 'http' | 'graphql';

export interface OpSample {
  kind: SampleKind;
  /** Route (`GET /users/:id`) or GraphQL field (`Query.users`). */
  name: string;
  durationMs: number;
  ok: boolean;
  /** Wall-clock ms (Date.now) when the op completed. */
  at: number;
}

export interface OpStats {
  name: string;
  kind: SampleKind;
  count: number;
  errorCount: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  max: number;
  lastMs: number;
}

export interface KindSummary {
  count: number;
  errorCount: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricsSnapshot {
  /** Window is the samples currently retained (bounded by capacity). */
  sampleCount: number;
  capacity: number;
  total: number;
  errorCount: number;
  errorRate: number;
  throughputPerMin: number;
  windowMs: number;
  http: KindSummary;
  graphql: KindSummary;
  operations: OpStats[];
  recent: OpSample[];
}

const DEFAULT_CAPACITY = 2000;
const DEFAULT_RECENT = 100;

const percentile = (sortedAsc: number[], p: number): number => {
  if (!sortedAsc.length) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const index = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return round(sortedAsc[index] ?? 0);
};

const round = (value: number): number => Math.round(value * 100) / 100;

const summarize = (durations: number[], errorCount: number): KindSummary => {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    count: durations.length,
    errorCount,
    errorRate: durations.length ? round(errorCount / durations.length) : 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
};

/**
 * In-process, bounded metrics store. A ring buffer of the most recent samples
 * (percentiles are computed over what's retained), plus a shorter recent-op
 * log. Deliberately in-memory and single-replica — mirrors the SSE publisher
 * caveat; it is a dev tool, not production telemetry.
 */
export class MetricsCollector {
  private buffer: OpSample[] = [];
  private cursor = 0;
  private filled = false;
  private total = 0;
  private recent: OpSample[] = [];

  constructor(
    private capacity: number = DEFAULT_CAPACITY,
    private readonly recentLimit: number = DEFAULT_RECENT,
  ) {}

  configure(capacity: number): void {
    if (capacity > 0 && capacity !== this.capacity) {
      this.capacity = capacity;
      this.reset();
    }
  }

  record(sample: OpSample): void {
    this.total += 1;
    if (this.buffer.length < this.capacity) {
      this.buffer.push(sample);
    } else {
      this.buffer[this.cursor] = sample;
      this.cursor = (this.cursor + 1) % this.capacity;
      this.filled = true;
    }

    this.recent.push(sample);
    if (this.recent.length > this.recentLimit) {
      this.recent.shift();
    }
  }

  reset(): void {
    this.buffer = [];
    this.cursor = 0;
    this.filled = false;
    this.total = 0;
    this.recent = [];
  }

  snapshot(now: number): MetricsSnapshot {
    const samples = this.buffer;
    const httpDurations: number[] = [];
    const graphqlDurations: number[] = [];
    let httpErrors = 0;
    let graphqlErrors = 0;

    const perOp = new Map<string, { kind: SampleKind; durations: number[]; errors: number; last: number }>();
    let oldest = now;

    for (const sample of samples) {
      if (sample.at < oldest) {
        oldest = sample.at;
      }
      if (sample.kind === 'http') {
        httpDurations.push(sample.durationMs);
        if (!sample.ok) httpErrors += 1;
      } else {
        graphqlDurations.push(sample.durationMs);
        if (!sample.ok) graphqlErrors += 1;
      }

      const key = `${sample.kind}:${sample.name}`;
      let entry = perOp.get(key);
      if (!entry) {
        entry = { kind: sample.kind, durations: [], errors: 0, last: sample.durationMs };
        perOp.set(key, entry);
      }
      entry.durations.push(sample.durationMs);
      entry.last = sample.durationMs;
      if (!sample.ok) entry.errors += 1;
    }

    const operations: OpStats[] = [];
    for (const [key, entry] of perOp) {
      const sorted = [...entry.durations].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, value) => acc + value, 0);
      operations.push({
        name: key.slice(entry.kind.length + 1),
        kind: entry.kind,
        count: entry.durations.length,
        errorCount: entry.errors,
        errorRate: round(entry.errors / entry.durations.length),
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        avg: round(sum / entry.durations.length),
        max: round(sorted[sorted.length - 1] ?? 0),
        lastMs: round(entry.last),
      });
    }
    operations.sort((a, b) => b.p95 - a.p95 || b.count - a.count);

    const windowMs = Math.max(0, now - oldest);
    const windowStart = now - 60_000;
    const throughputWindow = samples.filter((sample) => sample.at >= windowStart).length;
    const errorCount = httpErrors + graphqlErrors;

    return {
      sampleCount: samples.length,
      capacity: this.capacity,
      total: this.total,
      errorCount,
      errorRate: samples.length ? round(errorCount / samples.length) : 0,
      throughputPerMin: throughputWindow,
      windowMs,
      http: summarize(httpDurations, httpErrors),
      graphql: summarize(graphqlDurations, graphqlErrors),
      operations,
      recent: [...this.recent].reverse(),
    };
  }
}

let singleton: MetricsCollector | undefined;

/** Process-wide collector shared by the timing interceptors and the API endpoints. */
export const getMetricsCollector = (): MetricsCollector => {
  if (!singleton) {
    singleton = new MetricsCollector();
  }
  return singleton;
};

/** Test-only: drop the singleton so each test starts clean. */
export const resetMetricsCollectorForTests = (): void => {
  singleton = undefined;
};
