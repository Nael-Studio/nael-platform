import type { GuideEntry } from '../../types';
import { bestPracticesGuide } from './best-practices';
import { gettingStartedGuide } from './getting-started';
import { testingGuide } from './testing';
import { troubleshootingGuide } from './troubleshooting';
import { projectStructureGuide } from './project-structure';

export const guides: GuideEntry[] = [
  gettingStartedGuide,
  bestPracticesGuide,
  projectStructureGuide,
  testingGuide,
  troubleshootingGuide,
];

export function findGuideById(id: string): GuideEntry | undefined {
  return guides.find((guide) => guide.id === id);
}
