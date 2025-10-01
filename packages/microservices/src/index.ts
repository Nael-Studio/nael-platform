import 'reflect-metadata';

export type {
  MessagePattern as MessagePatternType,
  MessageContext,
  MessageHandler,
  Transport,
} from './interfaces/transport';

export {
  MessagePattern,
  EventPattern,
  getMessagePatternMetadata,
  listMessageHandlers,
} from './decorators/patterns';

export { MicroserviceClient } from './client/microservice-client';

export { DaprTransport, type DaprTransportOptions } from './transport/dapr-transport';

export {
  MicroservicesModule,
  createMicroservicesModule,
  type MicroservicesModuleOptions,
} from './microservices.module';
