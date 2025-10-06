export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptTemplate {
  name: string;
  description: string;
  arguments: PromptArgument[];
  build: (args: Record<string, string>) => string;
}
