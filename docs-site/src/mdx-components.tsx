import type { MDXComponents } from 'mdx/types';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/shared/simple-code-block';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Badge,
    CodeBlock,
    ...components,
  };
}
