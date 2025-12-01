import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Layers,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamplesShowcase } from "@/components/sections/examples-showcase";

export const metadata: Metadata = {
  title: "Nael Platform Docs",
  description:
    "Official documentation hub for the Nael Platform Bun framework with Better Auth, GraphQL, microservices, and schedulers.",
};

const supportAreas = [
  {
    title: "Better Auth",
    description: "Proxy hosted routes, wire multi-tenant guards, and sync sessions across transports.",
    points: ["Proxy module", "GraphQL guard", "Tenant registry"],
    icon: ShieldCheck,
  },
  {
    title: "GraphQL & Federation",
    description: "Spin up subgraphs, gateways, and persisted queries from the same NaelFactory instance.",
    points: ["Apollo subgraph", "Federation gateway", "Persisted queries"],
    icon: Layers,
  },
  {
    title: "Microservices & Scheduler",
    description: "Dapr pub/sub, Bun Worker cron jobs, and queue consumers powered by decorators.",
    points: ["Dapr subscribers", "Cron/Interval/Timeout", "Worker isolation"],
    icon: Workflow,
  },
  {
    title: "Tooling",
    description: "`nl` CLI, workspace scripts, and generator commands that mirror NestJS ergonomics.",
    points: ["nl new", "nl doctor", "Generators"],
    icon: Terminal,
  },
];

const compatibilityMatrix = [
  { label: "Runtime", value: "Bun 1.1+", detail: "Native ESM" },
  { label: "Auth", value: "Better Auth", detail: "Single + multi-tenant" },
  { label: "Transports", value: "HTTP · GraphQL · Dapr", detail: "Shared DI context" },
  { label: "Databases", value: "ORM agnostic", detail: "Works with Prisma/Drizzle" },
];

const quickLinks = [
  {
    title: "Deep dive overview",
    description: "Philosophy, installation strategies, and advanced techniques in one place.",
    href: "/docs",
  },
  {
    title: "Getting Started",
    description: "Install the CLI, scaffold a service, and run the curated examples.",
    href: "/docs/getting-started",
  },
  {
    title: "Installation guide",
    description: "Mix and match @nl-framework packages or clone the monorepo.",
    href: "/docs/installation",
  },
  {
    title: "CLI reference",
    description: "Command matrix, generators, diagnostics, and script shorthands.",
    href: "/docs/cli",
  },
];

export default function Home() {
  return (
    <article className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-primary/10 via-background to-background p-8 text-center shadow-lg">
        <div className="mx-auto max-w-3xl space-y-6">
          <Badge className="mx-auto w-fit bg-primary/15 text-primary">Bun-native framework</Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Ship Better Auth-powered services without leaving Bun</h1>
          <p className="text-lg text-muted-foreground">
            Nael Platform pairs NestJS-like ergonomics with Bun performance. This documentation hub keeps your team oriented—
            from first scaffold to multi-tenant production rollouts.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/docs/getting-started">Start building</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link className="inline-flex items-center gap-2" href="/docs">
                Explore the overview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {compatibilityMatrix.map((item) => (
              <Card className="border-border/40 bg-background/70" key={item.label}>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{item.label}</CardTitle>
                  <p className="text-xl font-semibold text-foreground">{item.value}</p>
                  <CardDescription>{item.detail}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background" />
      </section>

      <section className="space-y-6" id="support">
        <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-4 w-4" /> What we support
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {supportAreas.map((area) => (
            <Card className="border-border/60" key={area.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <area.icon className="h-5 w-5 text-primary" />
                  <CardTitle>{area.title}</CardTitle>
                </div>
                <CardDescription>{area.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {area.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6" id="quick-links">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Documentation</p>
            <h2 className="text-3xl font-semibold">Choose your next stop</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="https://github.com/Nael-Studio/nael-platform" rel="noreferrer" target="_blank">
              Star the repo
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Card className="border-border/60" key={link.href}>
              <CardHeader>
                <CardTitle>{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="ghost">
                  <Link className="inline-flex items-center gap-2" href={link.href}>
                    Read more
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6" id="examples">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Examples</p>
            <h2 className="text-3xl font-semibold">Production-ready templates</h2>
          </div>
          <Button asChild>
            <Link href="https://github.com/Nael-Studio/nael-platform/tree/main/examples" rel="noreferrer" target="_blank">
              Browse repo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ExamplesShowcase />
      </section>
    </article>
  );
}
