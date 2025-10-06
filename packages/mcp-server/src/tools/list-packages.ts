import { packageList } from '../docs/packages';
import type { McpTool } from './types';
import { asTextContent, formatList } from './types';

export const listPackagesTool: McpTool = {
  name: 'list-packages',
  description: 'List every Nael Framework package with descriptions and highlights.',
  async handler() {
    const summaryLines = packageList.map(
      (pkg, index) => `${index + 1}. ${pkg.name}: ${pkg.description}`,
    );

    return {
      content: [
        asTextContent(
          `Discovered ${packageList.length} packages:\n${formatList(summaryLines)}`,
        ),
      ],
      structuredContent: {
        packages: packageList,
      },
      metadata: {
        count: packageList.length,
      },
    };
  },
};
