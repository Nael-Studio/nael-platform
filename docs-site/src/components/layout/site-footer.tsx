import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="container flex flex-col gap-3 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} NL Framework. MIT + Apache 2.0 where
          applicable.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            className="hover:text-foreground"
            href="https://github.com/NL Framework-Studio/nael-platform"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </Link>
          <Link className="hover:text-foreground" href="https://nael.dev" rel="noreferrer" target="_blank">
            Studio
          </Link>
          <Link className="hover:text-foreground" href="/installation">
            Install Guide
          </Link>
        </div>
      </div>
    </footer>
  );
}
