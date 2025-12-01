import { promises as fs } from "fs";
import path from "path";

type SearchDoc = {
  title: string;
  description: string;
  href: string;
  section: string;
  headings?: string[];
  content?: string;
  codeBlocks?: string[];
};

const DOCS_ROOT = path.join(process.cwd(), "src", "app", "docs");
const PUBLIC_OUTPUT = path.join(process.cwd(), "public", "search-index.json");

const isPageFile = (file: string) =>
  file.endsWith("page.tsx") || file.endsWith("page.mdx") || file.endsWith("page.md");

const stripRoute = (filePath: string) => {
  const relative = path.relative(path.join(process.cwd(), "src", "app"), filePath);
  const noPage = relative.replace(/\/page\.(tsx|mdx|md)$/, "");
  return "/" + noPage.replace(/\\/g, "/");
};

const extractMetadata = (content: string) => {
  const titleMatch = content.match(/title:\s*["'`](.+?)["'`]/);
  const descriptionMatch = content.match(/description:\s*["'`](.+?)["'`]/);
  return {
    title: titleMatch?.[1]?.trim(),
    description: descriptionMatch?.[1]?.trim(),
  };
};

const extractHeadings = (content: string) => {
  const headings: string[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      headings.push(match[2].trim());
    }
  }
  return headings;
};

const extractParagraph = (content: string) => {
  // crude paragraph extraction: first non-empty line that isn't metadata or code fence
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("import") || trimmed.startsWith("export")) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("```")) continue;
    return trimmed.replace(/<[^>]+>/g, "").replace(/\{.+?\}/g, "").trim();
  }
  return "";
};

const extractCodeBlocks = (content: string): string[] => {
  const codeBlocks: string[] = [];
  
  // Extract from export const blocks (template literals)
  const exportConstRegex = /export const \w+\s*=\s*`([\s\S]*?)`\s*;/g;
  let match;
  while ((match = exportConstRegex.exec(content)) !== null) {
    if (match[1]) {
      codeBlocks.push(match[1].trim());
    }
  }
  
  // Extract from markdown code blocks
  const lines = content.split("\n");
  let inCodeBlock = false;
  let currentBlock: string[] = [];
  
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock && currentBlock.length > 0) {
        codeBlocks.push(currentBlock.join("\n").trim());
        currentBlock = [];
      }
      inCodeBlock = !inCodeBlock;
    } else if (inCodeBlock) {
      currentBlock.push(line);
    }
  }
  
  return codeBlocks;
};

const extractContent = (content: string) => {
  // Extract text content from MDX, including documentation text
  const lines = content.split("\n");
  const textLines: string[] = [];
  let inCodeBlock = false;
  let inFrontMatter = false;
  let inExportConst = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip front matter
    if (trimmed === "---") {
      inFrontMatter = !inFrontMatter;
      continue;
    }
    if (inFrontMatter) continue;

    // Skip code blocks
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Skip export const blocks (code examples stored as variables)
    if (trimmed.startsWith("export const")) {
      inExportConst = true;
      continue;
    }
    if (inExportConst) {
      // End of export const when we hit a line that starts with export, import, or <article
      if (trimmed.startsWith("export ") || trimmed.startsWith("import ") || trimmed.startsWith("<article") || trimmed.startsWith("<")) {
        inExportConst = false;
      } else {
        continue;
      }
    }

    // Skip imports/exports
    if (trimmed.startsWith("import") || trimmed.startsWith("export")) continue;

    // Skip empty lines
    if (!trimmed) continue;

    // Clean and add text content
    const cleaned = trimmed
      .replace(/<[^>]+>/g, " ") // Remove JSX tags
      .replace(/\{[^}]+\}/g, " ") // Remove JSX expressions
      .replace(/`([^`]+)`/g, "$1") // Remove backticks but keep content
      .replace(/[#*_]/g, "") // Remove markdown formatting
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    if (cleaned) {
      textLines.push(cleaned);
    }
  }

  return textLines.join(" ");
};

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (isPageFile(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

async function build() {
  const files = await walk(DOCS_ROOT);
  const docs: SearchDoc[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const meta = extractMetadata(content);
    const href = stripRoute(file);
    const headings = extractHeadings(content);
    const description = meta.description || extractParagraph(content);
    const title = meta.title || headings[0] || path.basename(path.dirname(file));
    const sectionParts = href.split("/").filter(Boolean);
    const section = sectionParts.length > 1 ? sectionParts[1] ?? "Docs" : "Docs";
    const pageContent = extractContent(content);
    const codeBlocks = extractCodeBlocks(content);

    docs.push({
      title,
      description,
      href,
      section,
      headings,
      content: pageContent,
      codeBlocks,
    });
  }

  await fs.mkdir(path.dirname(PUBLIC_OUTPUT), { recursive: true });
  await fs.writeFile(PUBLIC_OUTPUT, JSON.stringify(docs, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Search index written with ${docs.length} entries to ${PUBLIC_OUTPUT}`);
}

build().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to build search index", error);
  process.exit(1);
});
