import type { Provider, Token, ClassType } from './provider';

export interface ModuleMetadata {
  imports?: ClassType[];
  providers?: Provider[];
  controllers?: ClassType[];
  resolvers?: ClassType[];
  exports?: Token[];
}
