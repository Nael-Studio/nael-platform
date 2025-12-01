"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeSnippetProps = {
  code: string;
  label?: string;
  className?: string;
};

export function CodeSnippet({ code, label, className }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Unable to copy", error);
    }
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-lg border border-border bg-card p-4 font-mono text-sm text-card-foreground",
        className
      )}
    >
      {label && <p className="mb-2 text-xs uppercase text-muted-foreground">{label}</p>}
      <pre className="overflow-auto whitespace-pre-wrap text-sm leading-relaxed">
        <code>{code.trim()}</code>
      </pre>
      {/* #sym:shadcn copy action uses Button primitive */}
      <Button
        aria-label="Copy command"
        className="absolute right-3 top-3 h-8 w-8 p-0"
        onClick={handleCopy}
        size="icon"
        variant="outline"
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      </Button>
    </div>
  );
}
