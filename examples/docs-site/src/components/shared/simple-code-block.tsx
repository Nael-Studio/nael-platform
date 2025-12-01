"use client";

import type { BundledLanguage } from "@/components/kibo-ui/code-block";
import {
  CodeBlock as KiboCodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockItem,
} from "@/components/kibo-ui/code-block";

type SimpleCodeBlockProps = {
  code: string;
  language?: BundledLanguage;
  title?: string;
  className?: string;
};

function detectLanguage(code: string, title?: string): BundledLanguage {
  // Check title for file extensions
  if (title) {
    if (title.endsWith(".ts") || title.endsWith(".tsx")) return "typescript";
    if (title.endsWith(".js") || title.endsWith(".jsx")) return "javascript";
    if (title.endsWith(".json")) return "json";
    if (title.endsWith(".sh") || title.includes("bash")) return "bash";
    if (title.endsWith(".yml") || title.endsWith(".yaml")) return "yaml";
    if (title.endsWith(".css")) return "css";
    if (title.endsWith(".html")) return "html";
    if (title.endsWith(".md")) return "markdown";
  }

  // Check code content for common patterns
  if (code.includes("import {") || code.includes("export ") || code.includes("@")) {
    if (code.includes(": string") || code.includes(": number") || code.includes("interface ")) {
      return "typescript";
    }
    return "javascript";
  }

  if (code.trim().startsWith("{") && code.trim().endsWith("}")) {
    return "json";
  }

  if (code.includes("#!/bin/bash") || code.includes("cd ") || code.includes("npm ") || code.includes("bun ")) {
    return "bash";
  }

  return "typescript";
}

export function CodeBlock({
  code,
  language,
  title,
  className,
}: SimpleCodeBlockProps) {
  const detectedLang = language || detectLanguage(code, title);

  const data = [
    {
      language: detectedLang,
      filename: title || detectedLang,
      code,
    },
  ];

  return (
    <KiboCodeBlock data={data} defaultValue={detectedLang} className={className}>
      <CodeBlockHeader>
        {title && (
          <div className="flex-1 px-4 py-1.5 text-xs text-muted-foreground">
            {title}
          </div>
        )}
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
