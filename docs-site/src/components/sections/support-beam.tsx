"use client";

import { createRef, useMemo, useRef } from "react";
import { Workflow, Layers, Sparkles, Terminal, Database, ShieldCheck } from "lucide-react";

import { AnimatedBeam } from "@/components/ui/animated-beam";
import { BorderBeam } from "@/components/ui/border-beam";

const services = [
  { label: "BetterAuth tenants", icon: ShieldCheck },
  { label: "REST API", icon: Terminal },
  { label: "Federated GraphQL gateways", icon: Layers },
  { label: "Dapr pub/sub with decorators", icon: Sparkles },
  { label: "Bun Workers scheduler", icon: Workflow },
  { label: "Persisted queries + caching", icon: Terminal },
  { label: "NL ORM", icon: Database },
];

export function SupportBeam() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRefs = useMemo(
    () => services.map(() => createRef<HTMLDivElement>()),
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative mt-10 overflow-hidden rounded-2xl border border-border/70 bg-background/80 px-4 py-6 shadow-lg"
    >
      <BorderBeam size={120} duration={10} className="opacity-60" />
      <div className="relative grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-center sm:col-span-1">
          <div
            ref={sourceRef}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
          >
            <Sparkles className="h-4 w-4" />
            NL services
          </div>
        </div>
        <div className="relative flex flex-wrap justify-center gap-3 sm:col-span-2">
          {services.map((service, idx) => (
            <div
              key={service.label}
              ref={targetRefs[idx]}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground"
            >
              <service.icon className="h-4 w-4 text-primary" />
              {service.label}
            </div>
          ))}
        </div>
      </div>

      {targetRefs.map((ref, idx) => (
        <AnimatedBeam
          key={`beam-${services[idx].label}`}
          containerRef={containerRef}
          fromRef={sourceRef}
          toRef={ref}
          curvature={80}
          pathColor="var(--border)"
          pathWidth={2}
          pathOpacity={0.3}
          gradientStartColor="hsl(var(--primary))"
          gradientStopColor="hsl(var(--primary))"
          duration={5 + idx * 0.3}
          delay={idx * 0.2}
        />
      ))}
    </div>
  );
}
