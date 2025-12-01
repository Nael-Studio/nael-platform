"use client";

import type { BundledLanguage } from "@/components/kibo-ui/code-block";
import {
  CodeBlock as KiboCodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockFiles,
  CodeBlockHeader,
  CodeBlockItem,
} from "@/components/kibo-ui/code-block";

type CodeFile = {
  filename: string;
  code: string;
  language?: BundledLanguage;
};

type MultiFileCodeBlockProps = {
  files: CodeFile[];
  className?: string;
};

function detectLanguageFromFilename(filename: string): BundledLanguage {
  if (filename.endsWith(".ts")) return "typescript";
  if (filename.endsWith(".tsx")) return "tsx";
  if (filename.endsWith(".js")) return "javascript";
  if (filename.endsWith(".jsx")) return "jsx";
  if (filename.endsWith(".json")) return "json";
  if (filename.endsWith(".sh")) return "bash";
  if (filename.endsWith(".yml") || filename.endsWith(".yaml")) return "yaml";
  if (filename.endsWith(".css")) return "css";
  if (filename.endsWith(".html")) return "html";
  if (filename.endsWith(".md")) return "markdown";
  if (filename.endsWith(".graphql") || filename.endsWith(".gql")) return "graphql";
  if (filename.endsWith(".sql")) return "sql";
  return "typescript";
}

export function MultiFileCodeBlock({
  files,
  className,
}: MultiFileCodeBlockProps) {
  const data = files.map((file) => ({
    language: file.language || detectLanguageFromFilename(file.filename),
    filename: file.filename,
    code: file.code,
  }));

  return (
    <KiboCodeBlock
      data={data}
      defaultValue={data[0].language}
      className={className}
    >
      <CodeBlockHeader>
        <CodeBlockFiles>
          {(item) => (
            <CodeBlockFilename key={item.language} value={item.language}>
              {item.filename}
            </CodeBlockFilename>
          )}
        </CodeBlockFiles>
        <CodeBlockCopyButton />
      </CodeBlockHeader>
      <CodeBlockBody>
        {(item) => (
          <CodeBlockItem key={item.language} value={item.language} lineNumbers>
            <CodeBlockContent language={item.language as BundledLanguage}>
              {item.code}
            </CodeBlockContent>
          </CodeBlockItem>
        )}
      </CodeBlockBody>
    </KiboCodeBlock>
  );
}
