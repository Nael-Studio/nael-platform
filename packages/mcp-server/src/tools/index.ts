import { getBestPracticesTool } from './get-best-practices';
import { getDecoratorInfoTool } from './get-decorator-info';
import { getExampleTool } from './get-example';
import { getPackageDocsTool } from './get-package-docs';
import { getQuickStartTool } from './get-quick-start';
import { listPackagesTool } from './list-packages';
import { searchApiTool } from './search-api';
import { troubleshootTool } from './troubleshoot';
import type { McpTool } from './types';

export const tools: McpTool[] = [
  listPackagesTool,
  getPackageDocsTool,
  searchApiTool,
  getExampleTool,
  getQuickStartTool,
  getDecoratorInfoTool,
  getBestPracticesTool,
  troubleshootTool,
];
