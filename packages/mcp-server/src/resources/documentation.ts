import { docs } from '../docs';
import { exampleCatalog, findExampleById, findExamplesByCategory } from '../docs/examples';
import { findGuideById } from '../docs/guides';
import type { ResourceProvider, ResourceRequest, ResourceResponse } from './types';

const DOCS_URI = /^nael:\/\/docs\/(.+)$/;
const EXAMPLES_URI = /^nael:\/\/examples\/(.+)$/;
const GUIDES_URI = /^nael:\/\/guides\/(.+)$/;
const API_URI = /^nael:\/\/api\/(decorators|classes|interfaces)$/;

async function handleDocs(uri: string, match: RegExpExecArray): Promise<ResourceResponse | undefined> {
  const packageKey = match[1];
  const doc = docs.packages[packageKey as keyof typeof docs.packages];

  if (!doc) {
    return undefined;
  }

  return {
    uri,
    mimeType: 'application/json',
    data: doc,
  };
}

async function handleExamples(uri: string, match: RegExpExecArray): Promise<ResourceResponse | undefined> {
  const identifier = match[1];
  if (!identifier) {
    return undefined;
  }
  if (identifier === 'all') {
    return {
      uri,
      mimeType: 'application/json',
      data: exampleCatalog,
    };
  }

  const exampleById = findExampleById(identifier);
  if (exampleById) {
    return {
      uri,
      mimeType: 'application/json',
      data: exampleById,
    };
  }

  const categoryMatches = findExamplesByCategory(identifier);
  if (categoryMatches.length) {
    return {
      uri,
      mimeType: 'application/json',
      data: categoryMatches,
    };
  }

  return undefined;
}

async function handleGuides(uri: string, match: RegExpExecArray): Promise<ResourceResponse | undefined> {
  const identifier = match[1];
  if (!identifier) {
    return undefined;
  }
  if (identifier === 'all') {
    return {
      uri,
      mimeType: 'application/json',
      data: docs.guides,
    };
  }

  const guide = findGuideById(identifier);
  if (!guide) {
    return undefined;
  }

  return {
    uri,
    mimeType: 'application/json',
    data: guide,
  };
}

async function handleApi(uri: string, match: RegExpExecArray): Promise<ResourceResponse | undefined> {
  const section = match[1] as keyof typeof docs.api;

  if (!docs.api[section]) {
    return undefined;
  }

  return {
    uri,
    mimeType: 'application/json',
    data: docs.api[section],
  };
}

export const documentationResourceProvider: ResourceProvider = {
  name: 'nael-documentation',
  patterns: [DOCS_URI, EXAMPLES_URI, GUIDES_URI, API_URI],
  async resolve(request: ResourceRequest) {
    const { uri } = request;

    for (const pattern of this.patterns) {
      const match = pattern.exec(uri);
      if (!match) continue;

      if (pattern === DOCS_URI) {
        return handleDocs(uri, match);
      }
      if (pattern === EXAMPLES_URI) {
        return handleExamples(uri, match);
      }
      if (pattern === GUIDES_URI) {
        return handleGuides(uri, match);
      }
      if (pattern === API_URI) {
        return handleApi(uri, match);
      }
    }

    return undefined;
  },
};
