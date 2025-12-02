"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { Button } from "@/components/ui/button";
import { CommandSearch } from "@/components/search/command-search";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Documentation" },
];

type ThemeOption = "light" | "dark" | "system";

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (theme ?? resolvedTheme ?? "system") as ThemeOption;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="flex items-center gap-6">
          <Link className="font-semibold tracking-tight" href="/">
            NL Framework
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "text-muted-foreground transition-colors hover:text-foreground",
                  pathname === item.href && "text-foreground"
                )}
                key={item.href}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-48 sm:w-64">
            <CommandSearch />
          </div>
          {/* #sym:kibo-ui Theme Switcher for global appearance */}
          {mounted && (
            <ThemeSwitcher
              className="hidden sm:flex"
              onChange={(value) => setTheme(value)}
              value={currentTheme}
            />
          )}
          <Button asChild className="hidden sm:inline-flex" variant="outline">
            <Link href="https://github.com/NL Framework-Studio/nael-platform" rel="noreferrer" target="_blank">
              Star on GitHub
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
