"use client";

import Link from "next/link";
import { ArrowRightIcon, RocketIcon } from "lucide-react";
import {
  Banner,
  BannerAction,
  BannerIcon,
  BannerTitle,
} from "@/components/kibo-ui/banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-secondary/10 p-10">
      <div className="flex flex-col gap-6">
        <Badge className="w-fit bg-primary/10 text-primary">Bun-native · Multi-tenant · GraphQL</Badge>
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            BUILT FOR PLATFORM TEAMS
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Documentation for the Nael Framework
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            A NestJS-inspired developer experience that runs entirely on Bun. Build
            Better Auth multi-tenant APIs, Apollo Federation subgraphs, and Dapr-driven
            microservices without leaving a single toolchain.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/getting-started">
              Kick off a new service
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/installation">Install packages</Link>
          </Button>
        </div>
      </div>
      <div className="mt-8">
        {/* #sym:kibo-ui banner for multi-tenant callout */}
        <Banner className="flex-wrap gap-3 rounded-2xl border border-border/40 bg-primary/90 px-6 py-4 text-primary-foreground" inset>
          <BannerIcon className="bg-background/20" icon={RocketIcon} />
          <BannerTitle>
            Multi-tenant Better Auth + Apollo Federation samples now ship as reusable
            blueprints. Deploy once, hydrate per tenant.
          </BannerTitle>
          <BannerAction asChild variant="secondary">
            <Link href="/getting-started#multi-tenant">View the recipe</Link>
          </BannerAction>
        </Banner>
      </div>
    </section>
  );
}
