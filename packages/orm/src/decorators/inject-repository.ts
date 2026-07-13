import { Inject } from '@nl-framework/core';
import type { DocumentClass } from '../interfaces/document';
import { getRepositoryToken } from '../constants';

/**
 * Inject the repository for `document` on the given connection (default when
 * omitted). Sugar for `@Inject(getRepositoryToken(document, connectionName))`.
 *
 * ```ts
 * constructor(
 *   @InjectRepository(User) private readonly users: OrmRepository<User>,
 *   @InjectRepository(User, 'analytics') private readonly analyticsUsers: OrmRepository<User>,
 * ) {}
 * ```
 */
export const InjectRepository = <T extends object>(
  document: DocumentClass<T>,
  connectionName?: string,
): ParameterDecorator => Inject(getRepositoryToken(document, connectionName));
