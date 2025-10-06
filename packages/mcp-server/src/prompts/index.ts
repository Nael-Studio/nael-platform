import { createControllerPrompt } from './create-controller';
import { createResolverPrompt } from './create-resolver';
import { setupAuthPrompt } from './setup-auth';
import { setupDatabasePrompt } from './setup-database';
import { setupMicroservicePrompt } from './setup-microservice';
import type { PromptTemplate } from './types';

export const prompts: PromptTemplate[] = [
  createControllerPrompt,
  createResolverPrompt,
  setupMicroservicePrompt,
  setupAuthPrompt,
  setupDatabasePrompt,
];
