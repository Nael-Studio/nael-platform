import Link from "next/link";
import { ArrowUpRight, HeartHandshake, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const releases = [
  {
    label: "Better Auth multi-tenant",
    description: "Ship tenant-aware sessions with guard + proxy helpers.",
    href: "/docs/techniques/better-auth",
  },
  {
    label: "Apollo Federation starter",
    description: "Spin up a gateway and subgraph with shared DI context.",
    href: "/docs/techniques/graphql",
  },
  {
    label: "Microservices + scheduler",
    description: "Dapr pub/sub plus Bun Worker cron jobs in minutes.",
    href: "/docs/techniques/microservices",
  },
];

export function DocsRightRail() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 flex w-full flex-col gap-4">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Latest blueprints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {releases.map((release) => (
              <Link className="block rounded-lg border border-border/50 px-3 py-2 hover:border-primary" href={release.href} key={release.label}>
                <p className="font-medium text-foreground">{release.label}</p>
                <p>{release.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartHandshake className="h-4 w-4" />
              Sponsor the work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Nael Framework stays open-source thanks to sponsors. Back the roadmap if the Better Auth + Bun
              stack powers your product.
            </p>
            <Link className="inline-flex items-center text-primary" href="https://github.com/sponsors/Nael-Studio" rel="noreferrer" target="_blank">
              Become a sponsor
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
