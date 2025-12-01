"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchDocs as fallbackDocs, type SearchDoc } from "@/lib/search-data";
import Fuse from "fuse.js";

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const [docs, setDocs] = React.useState<SearchDoc[]>(fallbackDocs);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: SearchDoc[]) => {
        if (!cancelled && Array.isArray(data)) {
          setDocs(data);
        }
      })
      .catch(() => {
        setDocs(fallbackDocs);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const fuse = React.useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "title", weight: 0.4 },
          { name: "description", weight: 0.2 },
          { name: "content", weight: 0.3 },
          { name: "headings", weight: 0.1 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [docs]
  );

  const results = React.useMemo(() => {
    if (!query.trim()) {
      // Group by section when no query
      const grouped = docs.reduce((acc, doc) => {
        if (!acc[doc.section]) acc[doc.section] = [];
        acc[doc.section].push(doc);
        return acc;
      }, {} as Record<string, SearchDoc[]>);

      // Return first 3 from each section, max 15 total
      return Object.entries(grouped)
        .flatMap(([_, items]) => items.slice(0, 3))
        .slice(0, 15);
    }

    return fuse.search(query).slice(0, 12).map((r) => r.item);
  }, [query, fuse, docs]);

  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchDoc[]> = {};
    results.forEach((doc) => {
      if (!groups[doc.section]) {
        groups[doc.section] = [];
      }
      groups[doc.section].push(doc);
    });
    return groups;
  }, [results]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 w-full max-w-md items-center justify-start gap-2 rounded-md border border-input bg-muted/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search docs...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search documentation..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedResults).map(([section, items]) => (
            <CommandGroup key={section} heading={section.charAt(0).toUpperCase() + section.slice(1)}>
              {items.map((doc) => (
                <CommandItem
                  key={doc.href}
                  value={doc.title + " " + doc.description + " " + (doc.content || "")}
                  onSelect={() => handleSelect(doc.href)}
                  className="flex flex-col items-start gap-1"
                >
                  <div className="font-medium">{doc.title}</div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {doc.description}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
