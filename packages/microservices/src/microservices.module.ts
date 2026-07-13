import { Injectable, Module } from '@nl-framework/core';
import type { ClassType } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { registerHttpRouteRegistrar } from '@nl-framework/http';
import { MicroserviceClient } from './client/microservice-client';
import type { Transport } from './interfaces/transport';
import { DaprTransport } from './transport/dapr-transport';
import { createMicroserviceRouteRegistrar } from './http/route-registrar';

export interface MicroservicesModuleOptions {
  transport?: Transport;
  controllers?: ClassType[];
  /** Pub/sub component name advertised at `GET /dapr/subscribe`. Defaults to `pubsub`. */
  pubsubName?: string;
}

const MICROSERVICE_CLIENT = Symbol.for('nl:microservices:client');

@Injectable()
export class MicroservicesModule {
  private client?: MicroserviceClient;
  private readonly logger: Logger;

  constructor(
    private readonly loggerFactory: LoggerFactory,
    private readonly options: MicroservicesModuleOptions = {},
  ) {
    this.logger = loggerFactory.create({ context: 'MicroservicesModule' });
  }

  async onModuleInit(): Promise<void> {
    const transport =
      this.options.transport ??
      new DaprTransport({ logger: this.logger, pubsubName: this.options.pubsubName });
    this.client = new MicroserviceClient(transport);

    await this.client.connect();

    // Expose the handlers to Dapr: a `/dapr/subscribe` document plus one HTTP
    // route per pattern, all driven through the dispatcher pipeline.
    if (this.options.controllers?.length) {
      registerHttpRouteRegistrar(
        createMicroserviceRouteRegistrar({
          controllers: this.options.controllers,
          pubsubName: this.options.pubsubName ?? 'pubsub',
          logger: this.logger,
        }),
      );
    }

    this.logger.info('Microservices module initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.logger.info('Microservices module closed');
    }
  }

  getClient(): MicroserviceClient {
    if (!this.client) {
      throw new Error('Microservices module not initialized');
    }
    return this.client;
  }
}

export function createMicroservicesModule(options: MicroservicesModuleOptions = {}): ClassType {
  // Create a dynamic class that extends MicroservicesModule with the provided options
  @Injectable()
  class DynamicMicroservicesModuleImpl extends MicroservicesModule {
    constructor(loggerFactory: LoggerFactory) {
      super(loggerFactory, options);
    }
  }

  @Module({
    providers: [
      {
        provide: MICROSERVICE_CLIENT,
        useFactory: async (module: MicroservicesModule) => {
          return module.getClient();
        },
        inject: [DynamicMicroservicesModuleImpl],
      },
      {
        provide: MicroserviceClient,
        useFactory: (client: MicroserviceClient) => client,
        inject: [MICROSERVICE_CLIENT],
      },
      DynamicMicroservicesModuleImpl,
    ],
    exports: [MICROSERVICE_CLIENT, MicroserviceClient, DynamicMicroservicesModuleImpl],
  })
  class DynamicMicroservicesModule {}

  return DynamicMicroservicesModule;
}
