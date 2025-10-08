# Scheduler Example

This example showcases the `@nl-framework/scheduler` package running alongside the core DI container. It wires decorated cron/interval/timeout jobs, demonstrates dynamic runtime scheduling, and logs their execution using the shared logger.

## Features

- `@Cron`, `@Interval`, and `@Timeout` decorators registered automatically via `SchedulerService.registerDecoratedTarget`
- Dynamic runtime jobs scheduled with `scheduler.scheduleInterval` and tracked through `SchedulerRegistry`
- Bun Worker-backed execution so timers run off the main thread without blocking your application
- Graceful shutdown handling that drains scheduled jobs on `SIGINT` / `SIGTERM`

## Project structure

```
examples/scheduler
├── package.json           # Example dependencies and scripts
├── tsconfig.json          # TypeScript config extending the repo base
└── src/
    └── main.ts            # Application bootstrap + scheduled tasks
```

## Getting started

1. Build the framework packages (from the repo root) so the example sees fresh typings:

   ```bash
   bun run build
   ```

2. Start the scheduler example:

   ```bash
   bun run --filter @nl-framework/example-scheduler start
   ```

   The process immediately fires a warm-up timeout, then cycles through an interval and cron schedule while also registering a dynamic pulse job. Logs explain which task fired; use `Ctrl+C` to shut it down cleanly.

## Experiment

- Adjust the cron expression in `ReportScheduler.exportSummary` (e.g. `*/5 * * * * *` for every five seconds)
- Toggle `maxRuns` or `runOnInit` options on decorator metadata to explore different execution patterns
- Swap out the worker implementation by providing your own `SCHEDULER_WORKER_FACTORY` in the module imports for deterministic testing
- Inspect `SchedulerRegistry` to build custom health endpoints or administrative dashboards that list active jobs
