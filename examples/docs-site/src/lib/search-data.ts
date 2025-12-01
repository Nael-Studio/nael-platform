export type SearchDoc = {
  title: string;
  description: string;
  href: string;
  section: string;
  headings?: string[];
  content?: string;
};

export const searchDocs: SearchDoc[] = [];
