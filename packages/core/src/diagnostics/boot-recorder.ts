/**
 * Records module-initialization order and per-provider construction time during
 * bootstrap. Off by default and gated behind a single boolean, so leaving the
 * hooks in the container costs nothing until a tool (devtools) enables it —
 * which it must do *before* `app.bootstrap()`, i.e. from `forRoot`.
 */

export interface ProviderInitRecord {
  token: string;
  module?: string;
  type: 'class' | 'factory';
  /** Construction time of the instance itself, excluding dependency resolution. */
  durationMs: number;
  at: number;
}

export interface ModuleInitRecord {
  module: string;
  /** 0-based order in which the module finished hydrating. */
  order: number;
  durationMs: number;
  controllers: number;
  resolvers: number;
  at: number;
}

export interface BootReport {
  enabled: boolean;
  /** Wall-clock span of the recorded work (first start → last end). */
  totalMs: number;
  modules: ModuleInitRecord[];
  providers: ProviderInitRecord[];
  stats: {
    modules: number;
    providers: number;
    slowestProviderMs: number;
  };
}

const round = (value: number): number => Math.round(value * 100) / 100;

class BootRecorder {
  private enabled = false;
  private readonly modules: ModuleInitRecord[] = [];
  private readonly providers: ProviderInitRecord[] = [];
  private order = 0;

  enable(): void {
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  recordProvider(record: Omit<ProviderInitRecord, 'durationMs'> & { durationMs: number }): void {
    this.providers.push({ ...record, durationMs: round(record.durationMs) });
  }

  recordModule(record: Omit<ModuleInitRecord, 'order' | 'durationMs'> & { durationMs: number }): void {
    this.modules.push({ ...record, order: this.order++, durationMs: round(record.durationMs) });
  }

  report(): BootReport {
    const events = [
      ...this.modules.map((m) => ({ at: m.at, end: m.at + m.durationMs })),
      ...this.providers.map((p) => ({ at: p.at, end: p.at + p.durationMs })),
    ];
    const start = events.length ? Math.min(...events.map((e) => e.at)) : 0;
    const end = events.length ? Math.max(...events.map((e) => e.end)) : 0;
    const slowest = this.providers.reduce((max, p) => Math.max(max, p.durationMs), 0);

    return {
      enabled: this.enabled,
      totalMs: round(end - start),
      modules: [...this.modules].sort((a, b) => a.order - b.order),
      providers: [...this.providers].sort((a, b) => b.durationMs - a.durationMs),
      stats: {
        modules: this.modules.length,
        providers: this.providers.length,
        slowestProviderMs: round(slowest),
      },
    };
  }

  reset(): void {
    this.enabled = false;
    this.modules.length = 0;
    this.providers.length = 0;
    this.order = 0;
  }
}

let singleton: BootRecorder | undefined;

const getRecorder = (): BootRecorder => {
  if (!singleton) {
    singleton = new BootRecorder();
  }
  return singleton;
};

/** Turn on boot recording. Call before `app.bootstrap()` to capture everything. */
export const enableBootRecording = (): void => getRecorder().enable();

/** Fast gate used on the hot path — true only after {@link enableBootRecording}. */
export const isBootRecording = (): boolean => getRecorder().isEnabled();

export const recordProviderInit = (record: Omit<ProviderInitRecord, 'durationMs'> & { durationMs: number }): void =>
  getRecorder().recordProvider(record);

export const recordModuleInit = (
  record: Omit<ModuleInitRecord, 'order' | 'durationMs'> & { durationMs: number },
): void => getRecorder().recordModule(record);

export const getBootReport = (): BootReport => getRecorder().report();

/** Test-only: clear recorded data and disable. */
export const resetBootRecorderForTests = (): void => getRecorder().reset();
