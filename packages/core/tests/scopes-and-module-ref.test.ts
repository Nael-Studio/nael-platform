import { describe, expect, it } from 'bun:test';
import { Application, Injectable, Module, ModuleRef, Scope } from '../src';

@Injectable({ scope: Scope.REQUEST })
class RequestScopedService {
  readonly createdAt = Symbol('request');
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientService {
  readonly createdAt = Symbol('transient');
}

@Injectable()
class EmailService {
  send() {
    return 'sent';
  }
}

@Injectable()
class BillingService {
  getInvoiceNumber() {
    return 'INV-1';
  }
}

@Injectable()
class ExporterService {
  readonly created = Symbol('exporter');
}

@Injectable()
class ReportsService {
  constructor(private readonly moduleRef: ModuleRef) { }

  async sendReport() {
    const email = await this.moduleRef.resolve(EmailService);
    return email.send();
  }

  async createExporterInstance() {
    return this.moduleRef.create(ExporterService);
  }

  async resolveBillingLoosely() {
    return this.moduleRef.resolve(BillingService);
  }

  async resolveBillingStrictly() {
    return this.moduleRef.resolve(BillingService, { strict: true });
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedConsumer {
  constructor(private readonly moduleRef: ModuleRef, private readonly dependency: RequestScopedService) { }

  async usesSameScopedInstance(): Promise<boolean> {
    const resolved = await this.moduleRef.resolve(RequestScopedService);
    return resolved === this.dependency;
  }
}

@Module({
  providers: [BillingService],
  exports: [BillingService],
})
class BillingModule { }

@Module({
  imports: [BillingModule],
  providers: [EmailService, ReportsService, ExporterService],
})
class ReportingModule { }

@Module({
  providers: [RequestScopedService, TransientService, RequestScopedConsumer],
})
class ScopeModule { }

describe('Injection scopes', () => {
  it('isolates request-scoped providers per context', async () => {
    const app = new Application();
    const context = await app.bootstrap(ScopeModule);

    const contextIdA = context.createContextId('request-a');
    const contextIdB = context.createContextId('request-b');

    const first = await context.get(RequestScopedService, { contextId: contextIdA });
    const second = await context.get(RequestScopedService, { contextId: contextIdA });
    expect(first).toBe(second);

    const third = await context.get(RequestScopedService, { contextId: contextIdB });
    expect(third).not.toBe(first);

    await expect(context.get(RequestScopedService)).rejects.toThrow(/Request-scoped provider/);

    context.releaseContext(contextIdA);
    context.releaseContext(contextIdB);
    await context.close();
  });

  it('creates a new instance for transient providers', async () => {
    const app = new Application();
    const context = await app.bootstrap(ScopeModule);

    const first = await context.get(TransientService);
    const second = await context.get(TransientService);

    expect(first).not.toBe(second);

    await context.close();
  });
});

describe('ModuleRef', () => {
  it('resolves providers dynamically and enforces strict boundaries', async () => {
    const app = new Application();
    const context = await app.bootstrap(ReportingModule);

    const reports = await context.get(ReportsService);
    expect(await reports.sendReport()).toBe('sent');

    const exporterA = await reports.createExporterInstance();
    const exporterB = await reports.createExporterInstance();
    expect(exporterA).not.toBe(exporterB);

    const billing = await reports.resolveBillingLoosely();
    expect(billing.getInvoiceNumber()).toBe('INV-1');

    await expect(reports.resolveBillingStrictly()).rejects.toThrow(/not part of module/i);

    await context.close();
  });

  it('reuses the active request context for ModuleRef resolutions', async () => {
    const app = new Application();
    const context = await app.bootstrap(ScopeModule);
    const contextId = context.createContextId('module-ref-request');

    const consumer = await context.get(RequestScopedConsumer, { contextId });
    expect(await consumer.usesSameScopedInstance()).toBe(true);

    context.releaseContext(contextId);
    await context.close();
  });
});
