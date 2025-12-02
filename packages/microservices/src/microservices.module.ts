import { Injectable, Module } from '@nl-framework/core';
import type { ClassType } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { MicroserviceClient } from './client/microservice-client';
import type { Transport } from './interfaces/transport';
import { DaprTransport } from './transport/dapr-transport';
import { listMessageHandlers } from './decorators/patterns';
import { MessageDispatcher } from './dispatcher/message-dispatcher';

export interface MicroservicesModuleOptions {
  transport?: Transport;
  controllers?: ClassType[];
}

const MICROSERVICE_CLIENT = Symbol.for('nl:microservices:client');

@Injectable()
export class MicroservicesModule {
  private client?: MicroserviceClient;
  private logger: Logger;
  private dispatcher?: MessageDispatcher;
  private controllerInstances: any[] = [];

  constructor(
    private readonly loggerFactory: LoggerFactory,
    private readonly options: MicroservicesModuleOptions = {},
  ) {
    this.logger = loggerFactory.create({ context: 'MicroservicesModule' });
  }

  async onModuleInit(): Promise<void> {
    const transport = this.options.transport ?? new DaprTransport({ logger: this.logger });
    this.client = new MicroserviceClient(transport);
    this.dispatcher = new MessageDispatcher();

    await this.client.connect();
    this.logger.info('Microservices module initialized');

    // Register message handlers from controllers
    if (this.options.controllers) {
      this.instantiateControllers(this.options.controllers);
      this.registerMessageHandlers();
    }
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

  getDispatcher(): MessageDispatcher | undefined {
    return this.dispatcher;
  }

  private instantiateControllers(controllers: ClassType[]): void {
    for (const Controller of controllers) {
      try {
        const instance = new Controller();
        this.controllerInstances.push(instance);
      } catch (err) {
        this.logger.error(`Failed to instantiate controller ${Controller.name}`, { err });
      }
    }
  }

  private registerMessageHandlers(): void {
    for (const controller of this.controllerInstances) {
      const handlers = listMessageHandlers(controller);

      if (handlers.length > 0) {
        this.logger.info('Registered message handlers', {
          controller: controller.constructor?.name ?? 'unknown',
          handlers: handlers.map((h) => ({
            method: h.propertyKey,
            pattern: h.metadata.pattern,
            isEvent: h.metadata.isEvent,
          })),
        });
        this.dispatcher?.registerController(controller);
      }
    }
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
      MessageDispatcher,
      DynamicMicroservicesModuleImpl,
      ...(options.controllers ?? []),
    ],
    exports: [MICROSERVICE_CLIENT, MicroserviceClient, MessageDispatcher, DynamicMicroservicesModuleImpl],
  })
  class DynamicMicroservicesModule {}

  return DynamicMicroservicesModule;
}
