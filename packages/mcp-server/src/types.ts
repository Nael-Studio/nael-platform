/**
 * Type definitions for Nael Framework documentation structure
 */

export interface DecoratorDoc {
  name: string;
  signature: string;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  description: string;
  examples: string[];
  package: string;
}

export interface ClassDoc {
  name: string;
  description: string;
  package: string;
  constructor?: {
    parameters?: {
      name: string;
      type: string;
      description: string;
    }[];
  };
  methods: {
    name: string;
    signature: string;
    description: string;
    parameters?: {
      name: string;
      type: string;
      description: string;
    }[];
    returns?: string;
  }[];
  examples: string[];
}

export interface InterfaceDoc {
  name: string;
  description: string;
  package: string;
  properties: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  examples?: string[];
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  explanation?: string;
  tags: string[];
}

export interface BestPractice {
  category: string;
  do: {
    title: string;
    description: string;
    code?: string;
  }[];
  dont: {
    title: string;
    description: string;
    code?: string;
  }[];
}

export interface TroubleshootingGuide {
  issue: string;
  symptoms: string[];
  solution: string;
  code?: string;
  relatedTopics?: string[];
}

export interface PackageDocumentation {
  name: string;
  version: string;
  description: string;
  installation: string;
  
  features: {
    title: string;
    description: string;
    icon?: string;
  }[];
  
  quickStart: {
    description: string;
    steps: string[];
    code: string;
  };
  
  api: {
    decorators?: DecoratorDoc[];
    classes?: ClassDoc[];
    interfaces?: InterfaceDoc[];
  };
  
  examples: CodeExample[];
  
  bestPractices: BestPractice[];
  
  troubleshooting: TroubleshootingGuide[];
  
  relatedPackages?: string[];
  
  changelog?: {
    version: string;
    changes: string[];
  }[];
}

export type PackageName = 
  | 'core'
  | 'http'
  | 'graphql'
  | 'platform'
  | 'config'
  | 'logger'
  | 'orm'
  | 'auth'
  | 'microservices';
