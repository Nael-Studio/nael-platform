"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { docsNav } from "@/lib/docs-nav";

const buildInitialOpenState = (pathname: string) =>
  Object.fromEntries(
    docsNav.map((section) => [
      section.title,
      section.items.some((item) => item.href.split("#")[0] === pathname),
    ]),
  );

export function DocsSidebar() {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState<string>("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    buildInitialOpenState(pathname),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateHash = () => setActiveHash(window.location.hash || "");

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const isActive = (href: string) => {
    const [hrefPath, hrefRawHash = ""] = href.split("#");
    const targetHash = hrefRawHash ? `#${hrefRawHash}` : "";
    const normalizedPath = hrefPath || "/";
    if (normalizedPath !== "/") {
      if (pathname !== normalizedPath) return false;
      return targetHash ? targetHash === activeHash : true;
    }
    if (pathname !== "/") return false;
    return targetHash ? targetHash === activeHash : true;
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 pr-4 text-sm lg:flex">
      <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
        {docsNav.map((section) => (
          <div className="mt-6 first:mt-0" key={section.title}>
            <button
              className="flex w-full items-center justify-between rounded-md px-1 py-1 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
              onClick={() => toggleSection(section.title)}
              type="button"
            >
              <span>{section.title}</span>
              {openSections[section.title] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {openSections[section.title] && (
              <div className="mt-2 flex flex-col gap-1">
                {section.items.map((item) => (
                  <Link
                    className={cn(
                      "rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground",
                      isActive(item.href) && "bg-secondary text-foreground",
                    )}
                    href={item.href}
                    key={item.title}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export function DocsSidebarMobile() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState<string>("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    buildInitialOpenState(pathname),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateHash = () => setActiveHash(window.location.hash || "");
    updateHash();
    window.addEventListener("hashchange", updateHash);
    setOpenSections(buildInitialOpenState(pathname));
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const isActive = (href: string) => {
    const [hrefPath, hrefRawHash = ""] = href.split("#");
    const targetHash = hrefRawHash ? `#${hrefRawHash}` : "";
    const normalizedPath = hrefPath || "/";
    if (normalizedPath !== "/") {
      if (pathname !== normalizedPath) return false;
      return targetHash ? targetHash === activeHash : true;
    }
    if (pathname !== "/") return false;
    return targetHash ? targetHash === activeHash : true;
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="lg:hidden">
      <Button className="w-full" onClick={() => setOpen((prev) => !prev)} variant="outline">
        {open ? "Hide menu" : "Documentation menu"}
      </Button>
      {open && (
        <div className="mt-4 rounded-2xl border border-border/70 bg-card p-4 text-sm">
          {docsNav.map((section) => (
            <div className="mt-5 first:mt-0" key={section.title}>
              <button
                className="flex w-full items-center justify-between rounded-md px-1 py-1 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection(section.title)}
                type="button"
              >
                <span>{section.title}</span>
                {openSections[section.title] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {openSections[section.title] && (
                <div className="mt-2 flex flex-col gap-1">
                  {section.items.map((item) => (
                    <Link
                      className={cn(
                        "rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                        isActive(item.href) && "bg-secondary text-foreground",
                      )}
                      href={item.href}
                      key={item.title}
                      onClick={() => setOpen(false)}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
