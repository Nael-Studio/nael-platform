# @nl-framework/scheduler

Task scheduling utilities for the Nael Framework. Inspired by NestJS Schedule, this package lets you decorate injectable services with cron, interval, and timeout jobs, backed by Bun Workers for accurate timing that won't block your main event loop.

## Features

- `@Cron`, `@Interval`, and `@Timeout` decorators with optional names, `runOnInit`, and `maxRuns` controls
- Central `SchedulerService` with runtime APIs for dynamic jobs
- `SchedulerRegistry` for inspecting and managing registered jobs at runtime
- Bun Worker-based timer execution for better isolation and timing accuracy

## Installation

```bash
bun add @nl-framework/scheduler
```

## Quick start

```ts
import { Injectable, Module } from '@nl-framework/core';
import { SchedulerModule, SchedulerService, Cron } from '@nl-framework/scheduler';

@Injectable()
class ReportService {
  constructor(private readonly scheduler: SchedulerService) {}

  @Cron('0 * * * *', { runOnInit: true })
  async hourlyReport() {
    // ...generate report
  }

  async onModuleInit() {
    await this.scheduler.registerDecoratedTarget(this);
  }
}

@Module({
  imports: [SchedulerModule.forFeature(ReportService)],
})
class ReportingModule {}
```

- Use `SchedulerModule.forFeature(ReportService)` (or pass an array for multiple schedulers) to register your injectable class as a scheduler feature.
- Inject `SchedulerService` and call `registerDecoratedTarget` (usually inside `onModuleInit`) to activate all decorated methods.

## Runtime management

The `SchedulerService` exposes imperative APIs for dynamic scheduling:

```ts
await scheduler.scheduleInterval('cleanup', 60_000, () => cleanup(), { maxRuns: 10 });
await scheduler.cancel('cleanup');
```

`SchedulerRegistry` maintains a snapshot of active jobs and powers the `scheduler.list*()` helpers for observability.

## Testing Helpers

In tests you can mock the worker by providing a custom `SchedulerWorkerFactory` when creating the module, enabling deterministic execution without spinning up a real worker.

## License

Apache-2.0. See the repository root `LICENSE` file for details.
