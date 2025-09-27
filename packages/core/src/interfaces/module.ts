import type { Provider, Token, ClassType } from './provider.js';

export interface ModuleMetadata {
  imports?: ClassType[];
  providers?: Provider[];
  controllers?: ClassType[];
  exports?: Token[];
}
