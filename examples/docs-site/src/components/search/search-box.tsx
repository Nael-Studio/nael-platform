/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { searchDocs as fallbackDocs, type SearchDoc } from "@/lib/search-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
   const [docs, setDocs] = useState<SearchDoc[]>(fallbackDocs);

  useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: SearchDoc[]) => {
        if (!cancelled && Array.isArray(data)) {
          setDocs(data);
        }
      })
      .catch(() => {
        // fall back to bundled list
        setDocs(fallbackDocs);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "title", weight: 0.5 },
          { name: "description", weight: 0.3 },
          { name: "headings", weight: 0.2 },
        ],
        threshold: 0.35,
      }),
    [docs],
  );

  const results = useMemo(() => {
    if (!query.trim()) return docs.slice(0, 5);
    return fuse.search(query).slice(0, 8).map((r) => r.item);
  }, [query, fuse, docs]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById("docs-search-input") as HTMLInputElement | null;
        el?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const showDropdown = focused && results.length > 0;

  return (
    <div className="relative w-full max-w-md">
      <Input
        id="docs-search-input"
        placeholder="Search docs... (⌘/Ctrl + K)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)} // allow clicks
        className="h-9 bg-muted/60 text-sm"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 mt-2 rounded-md border border-border/70 bg-popover shadow-lg">
          <ul className="max-h-80 overflow-auto py-2 text-sm">
            {results.map((doc) => (
              <SearchResult key={doc.href} doc={doc} onSelect={() => setQuery("")} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SearchResult({ doc, onSelect }: { doc: SearchDoc; onSelect: () => void }) {
  return (
    <li>
      <Link
        href={doc.href}
        className={cn(
          "flex flex-col gap-0.5 px-3 py-2 transition-colors",
          "hover:bg-muted/80 focus-visible:bg-muted/80 focus-visible:outline-none",
        )}
        onClick={onSelect}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">{doc.title}</span>
          <span className="text-xs uppercase text-muted-foreground">{doc.section}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>
      </Link>
    </li>
  );
}
