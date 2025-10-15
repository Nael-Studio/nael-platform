export interface PackageDocumentation {
  name: string;
  version: string;
  description: string;
  installation: string;
  features: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  quickStart: {
    description: string;
    steps: string[];
    code: string;
  };
  api: {
    decorators?: Array<{
      name: string;
      signature: string;
      description: string;
      parameters?: Array<{
        name: string;
        type: string;
        description: string;
        required?: boolean;
      }>;
      examples?: string[];
    }>;
    classes?: Array<{
      name: string;
      description: string;
      methods: Array<{
        name: string;
        signature: string;
        description: string;
      }>;
      examples?: string[];
    }>;
    interfaces?: Array<{
      name: string;
      description: string;
      properties: Array<{
        name: string;
        type: string;
        description: string;
        required: boolean;
      }>;
    }>;
    functions?: Array<{
      name: string;
      signature: string;
      description: string;
      examples?: string[];
    }>;
  };
  examples: Array<{
    title: string;
    description: string;
    code: string;
    explanation?: string;
    tags?: string[];
  }>;
  bestPractices: Array<{
    category: string;
    do: Array<{
      title: string;
      description: string;
      code?: string;
    }>;
    dont: Array<{
      title: string;
      description: string;
      code?: string;
    }>;
  }>;
  troubleshooting: Array<{
    issue: string;
    symptoms: string[];
    solution: string;
    code?: string;
    relatedTopics?: string[];
  }>;
  relatedPackages?: string[];
  changelog?: Array<{
    version: string;
    changes: string[];
  }>;
}

export interface ExampleCatalogEntry {
  id: string;
  category: string;
  title: string;
  description: string;
  code: string;
  explanation?: string;
  tags?: string[];
  relatedPackages?: string[];
}

export interface GuideEntry {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  codeSamples?: Array<{
    heading: string;
    code: string;
    description?: string;
  }>;
  relatedPackages?: string[];
}

export interface ApiDecoratorEntry {
  name: string;
  signature: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }>;
  examples?: string[];
}

export interface ApiClassEntry {
  name: string;
  description: string;
  methods: Array<{
    name: string;
    signature: string;
    description: string;
  }>;
  examples?: string[];
}

export interface ApiInterfaceEntry {
  name: string;
  description: string;
  properties: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
}

export interface AppScaffoldResult {
  summary: string;
  files: Array<{
    path: string;
    contents: string;
    description?: string;
  }>;
  nextSteps: string[];
}
