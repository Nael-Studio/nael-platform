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
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MagicCard } from "@/components/ui/magic-card";
import { DotPattern } from "@/components/ui/dot-pattern";
import { RetroGrid } from "@/components/ui/retro-grid";
import { WordCycle } from "@/components/ui/word-cycle";

export const metadata: Metadata = {
  title: "NL Framework Docs",
  description:
    "Official documentation hub for the NL Framework Bun stack with BetterAuth, GraphQL, microservices, and schedulers.",
};

const supportAreas = [
  {
    title: "BetterAuth",
    description: "Proxy hosted routes, wire multi-tenant guards, and sync sessions across transports.",
    points: ["Proxy module", "GraphQL guard", "Tenant registry"],
    icon: ShieldCheck,
  },
  {
    title: "GraphQL & Federation",
    description: "Spin up subgraphs, gateways, and persisted queries from the same NLFactory instance.",
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
  { label: "Auth", value: "BetterAuth", detail: "Single + multi-tenant" },
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

const heroCycleWords = [
  "BetterAuth-powered services",
  "federated GraphQL gateways",
  "Dapr microservices",
  "Bun Worker schedulers",
  "persisted queries and caching",
];

export default function Home() {
  return (
    <article className="space-y-20">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 px-6 py-12 text-center shadow-2xl backdrop-blur sm:px-10">
        <RetroGrid className="opacity-70" />
        <DotPattern className="text-primary/25" cr={1.1} glow width={24} height={24} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-background/65 to-background" />
        <BorderBeam size={120} duration={8} className="opacity-60" />
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Badge className="w-fit bg-primary/15 text-primary">Bun-native framework</Badge>
            </div>
            <h1 className="grid place-items-center gap-2 text-center text-4xl font-semibold leading-tight tracking-tight sm:gap-3 sm:text-5xl">
              <span className="block">Ship</span>
              <WordCycle className="text-4xl sm:text-5xl" words={heroCycleWords} />
              <span className="block">without leaving Bun</span>
            </h1>
            <p className="text-lg text-foreground/90 sm:text-xl">
              NL Framework pairs NestJS-like ergonomics with Bun performance. This documentation hub keeps your team oriented—
              from first scaffold to multi-tenant production rollouts.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/docs/getting-started">Start building</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-foreground hover:text-foreground">
              <Link className="inline-flex items-center gap-2" href="/docs">
                Explore the overview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border/80 text-foreground hover:text-foreground"
            >
              <Link href="https://github.com/NL Framework-Studio/nael-platform" rel="noreferrer" target="_blank">
                Star the repo
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {compatibilityMatrix.map((item) => (
              <MagicCard className="h-full rounded-2xl" key={item.label}>
                <div className="relative h-full rounded-2xl border border-border/50 bg-background/80 p-4 text-left shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-semibold text-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </MagicCard>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6" id="support">
        <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-4 w-4" /> What we support
        </div>
        <p className="max-w-4xl text-muted-foreground">
          End-to-end scaffolding so teams can wire BetterAuth, GraphQL, schedulers, and microservices with the same ergonomics.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          {supportAreas.map((area) => (
            <MagicCard className="h-full rounded-2xl" key={area.title}>
              <Card className="h-full border border-border/60 bg-background/80">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 p-2 text-primary">
                      <area.icon className="h-5 w-5" />
                    </span>
                    <CardTitle>{area.title}</CardTitle>
                  </div>
                  <CardDescription>{area.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    {area.points.map((point) => (
                      <li className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-3 py-2" key={point}>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </MagicCard>
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
            <Link href="https://github.com/NL Framework-Studio/nael-platform" rel="noreferrer" target="_blank">
              Star the repo
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => (
            <MagicCard className="h-full rounded-2xl" key={link.href}>
              <Card className="h-full border border-border/60 bg-background/80">
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
            </MagicCard>
          ))}
        </div>
      </section>
    </article>
  );
}
