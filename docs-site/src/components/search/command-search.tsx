"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
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

const MAX_SEARCH_RESULTS = 10;
const MAX_HIGHLIGHT_MATCHES = 10;

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const [docs, setDocs] = React.useState<SearchDoc[]>(fallbackDocs);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const router = useRouter();

  // Debounce query input for better performance
  React.useEffect(() => {
    if (query !== debouncedQuery) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, debouncedQuery]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch search index:", res.status, res.statusText);
          return Promise.reject();
        }
        return res.json();
      })
      .then((data: SearchDoc[]) => {
        if (!cancelled && Array.isArray(data)) {
          if (process.env.NODE_ENV === "development") {
            console.log("Search index loaded:", data.length, "entries");
          }
          setDocs(data);
        }
      })
      .catch((err) => {
        console.error("Error loading search index:", err);
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
          { name: "title", weight: 0.3 },
          { name: "description", weight: 0.15 },
          { name: "content", weight: 0.25 },
          { name: "codeBlocks", weight: 0.2 },
          { name: "headings", weight: 0.1 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
        includeMatches: true,
        ignoreLocation: true,
        findAllMatches: false,
        useExtendedSearch: false,
      }),
    [docs]
  );

  const getContextSnippet = React.useCallback((text: string, query: string, maxLength = 150): string => {
    if (!query.trim() || !text) return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
    
    const before = 40;
    const after = 40;
    const start = Math.max(0, index - before);
    const end = Math.min(text.length, index + query.length + after);
    
    let snippet = text.slice(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";
    
    return snippet;
  }, []);

  const highlightMatch = React.useCallback((text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const parts: React.ReactNode[] = [];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let lastIndex = 0;
    
    // Find all occurrences
    const matches: number[] = [];
    let idx = lowerText.indexOf(lowerQuery);
    while (idx !== -1) {
      matches.push(idx);
      idx = lowerText.indexOf(lowerQuery, idx + 1);
    }
    
    // Limit to first MAX_HIGHLIGHT_MATCHES matches
    const limitedMatches = matches.slice(0, MAX_HIGHLIGHT_MATCHES);
    
    limitedMatches.forEach((matchIndex, i) => {
      // Add text before match
      if (matchIndex > lastIndex) {
        parts.push(text.slice(lastIndex, matchIndex));
      }
      // Add highlighted match
      parts.push(
        <mark key={`match-${i}`} className="bg-yellow-200 dark:bg-yellow-900 font-semibold rounded px-0.5">
          {text.slice(matchIndex, matchIndex + query.length)}
        </mark>
      );
      lastIndex = matchIndex + query.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
  }, []);

  const results = React.useMemo(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Computing results - debouncedQuery:", debouncedQuery, "docs count:", docs.length);
    }
    
    if (!debouncedQuery.trim()) {
      const grouped = docs.reduce((acc, doc) => {
        if (!acc[doc.section]) acc[doc.section] = [];
        acc[doc.section].push(doc);
        return acc;
      }, {} as Record<string, SearchDoc[]>);

      const defaultResults = Object.entries(grouped)
        .flatMap(([_, items]) => items.slice(0, 3))
        .slice(0, 15);
      
      if (process.env.NODE_ENV === "development") {
        console.log("Default results:", defaultResults.length);
      }
      return defaultResults;
    }

    // Debounce search for performance
    const searchResults = fuse.search(debouncedQuery).slice(0, MAX_SEARCH_RESULTS).map((r) => r.item);
    if (process.env.NODE_ENV === "development") {
      console.log("Search results for", debouncedQuery, ":", searchResults.length);
    }
    return searchResults;
  }, [debouncedQuery, fuse, docs]);

  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchDoc[]> = {};
    results.forEach((doc) => {
      if (!groups[doc.section]) {
        groups[doc.section] = [];
      }
      groups[doc.section].push(doc);
    });
    if (process.env.NODE_ENV === "development") {
      console.log("Grouped results:", Object.keys(groups), "Total items:", results.length);
    }
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
          {isSearching && debouncedQuery !== query ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </div>
          ) : (
            <>
              <CommandEmpty>No results found.</CommandEmpty>
              {Object.entries(groupedResults).length > 0 ? (
                Object.entries(groupedResults).map(([section, items]) => (
                  <CommandGroup key={section} heading={section.charAt(0).toUpperCase() + section.slice(1)}>
                    {items.map((doc) => {
                      const snippet = debouncedQuery.trim() 
                        ? getContextSnippet(doc.content || doc.description, debouncedQuery)
                        : doc.description;
                      
                      return (
                        <CommandItem
                          key={doc.href}
                          onSelect={() => handleSelect(doc.href)}
                          className="flex flex-col items-start gap-1 py-3"
                        >
                          <div className="font-medium">{highlightMatch(doc.title, debouncedQuery)}</div>
                          <div className="line-clamp-2 text-xs text-muted-foreground">
                            {highlightMatch(snippet, debouncedQuery)}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {docs.length === 0 ? "Loading search index..." : "Type to search"}
                </div>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
