import type { ClassType, DiscoveryService, Token } from '@nl-framework/core';

export type GraphNodeKind = 'module' | 'provider' | 'controller' | 'resolver';
export type GraphEdgeKind = 'imports' | 'provides' | 'injects';

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  /** Name of the owning module, for provider/controller/resolver nodes. */
  module?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: GraphEdgeKind;
}

export interface SystemGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    modules: number;
    providers: number;
    controllers: number;
    resolvers: number;
    edges: number;
  };
}

const moduleId = (moduleClass: ClassType): string => `module:${moduleClass.name}`;
const providerId = (name: string): string => `provider:${name}`;
const isClassToken = (token: Token): token is ClassType => typeof token === 'function';

/**
 * Build the module/provider/service dependency graph from a `DiscoveryService`.
 * - `imports` edges: module → module (from `@Module({ imports })`)
 * - `provides` edges: module → provider it owns
 * - `injects` edges: provider → provider it constructor-injects
 *
 * Pure and read-only: it reads metadata only, never resolves/instantiates.
 */
export const buildSystemGraph = (discovery: DiscoveryService): SystemGraph => {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (from: string, to: string, kind: GraphEdgeKind): void => {
    const key = `${kind}:${from}->${to}`;
    if (edgeKeys.has(key) || from === to) {
      return;
    }
    edgeKeys.add(key);
    edges.push({ from, to, kind });
  };

  const controllerClasses = new Set<ClassType>(discovery.getControllerClasses());
  const resolverClasses = new Set<ClassType>(discovery.getResolverClasses());

  // Modules + their import edges.
  for (const moduleClass of discovery.getModules()) {
    nodes.set(moduleId(moduleClass), {
      id: moduleId(moduleClass),
      label: moduleClass.name,
      kind: 'module',
    });
  }
  for (const moduleClass of discovery.getModules()) {
    for (const imported of discovery.getModuleImports(moduleClass)) {
      if (nodes.has(moduleId(imported))) {
        addEdge(moduleId(moduleClass), moduleId(imported), 'imports');
      }
    }
  }

  // Provider nodes + ownership edges. Map class → node id for injects resolution.
  const classToNode = new Map<ClassType, string>();
  const providers = discovery.getProviders();

  for (const provider of providers) {
    const id = providerId(provider.name);
    const kind: GraphNodeKind = provider.metatype
      ? controllerClasses.has(provider.metatype)
        ? 'controller'
        : resolverClasses.has(provider.metatype)
          ? 'resolver'
          : 'provider'
      : 'provider';

    nodes.set(id, { id, label: provider.name, kind, module: provider.module?.name });

    if (provider.metatype) {
      classToNode.set(provider.metatype, id);
    }
    if (isClassToken(provider.token)) {
      classToNode.set(provider.token, id);
    }
    if (provider.module && nodes.has(moduleId(provider.module))) {
      addEdge(moduleId(provider.module), id, 'provides');
    }
  }

  // Service → service injection edges.
  for (const provider of providers) {
    if (!provider.metatype) {
      continue;
    }
    const fromId = providerId(provider.name);
    for (const dependency of discovery.getConstructorDependencies(provider.metatype)) {
      if (!isClassToken(dependency)) {
        continue;
      }
      const targetId = classToNode.get(dependency);
      if (targetId) {
        addEdge(fromId, targetId, 'injects');
      }
    }
  }

  const nodeList = Array.from(nodes.values());
  return {
    nodes: nodeList,
    edges,
    stats: {
      modules: nodeList.filter((node) => node.kind === 'module').length,
      providers: nodeList.filter((node) => node.kind === 'provider').length,
      controllers: nodeList.filter((node) => node.kind === 'controller').length,
      resolvers: nodeList.filter((node) => node.kind === 'resolver').length,
      edges: edges.length,
    },
  };
};
