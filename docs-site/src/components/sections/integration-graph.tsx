"use client";

import { useMemo, useRef, createRef } from "react";
import { Database, GitBranch, Workflow, ShieldCheck, Cloud, Link2 } from "lucide-react";

import { AnimatedBeam } from "@/components/ui/animated-beam";

const nodes = [
  { label: "REST API", icon: Link2, position: "top-6 left-8" },
  { label: "GraphQL Gateway", icon: GitBranch, position: "top-6 right-8" },
  { label: "BetterAuth", icon: ShieldCheck, position: "left-6 top-1/2 -translate-y-1/2" },
  { label: "NL ORM", icon: Database, position: "right-6 top-1/2 -translate-y-1/2" },
  { label: "Schedulers", icon: Workflow, position: "bottom-6 left-10" },
  { label: "Dapr Microservices", icon: Cloud, position: "bottom-6 right-10" },
];

export function IntegrationGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const targetRefs = useMemo(
    () => nodes.map(() => createRef<HTMLDivElement>()),
    [],
  );

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-8 shadow-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background/70 to-background" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_50%,theme(colors.primary/25),transparent_45%)]" />
      <div className="relative aspect-[5/3] w-full" ref={containerRef}>
        <div
          ref={centerRef}
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 sm:h-24 sm:w-24"
        >
          <span className="text-sm font-semibold">NL</span>
          <span className="text-[10px] uppercase tracking-wide">Core</span>
        </div>

        {nodes.map((node, idx) => (
          <div
            key={node.label}
            ref={targetRefs[idx]}
            className={`absolute flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-foreground shadow-sm sm:text-sm ${node.position}`}
          >
            <node.icon className="h-4 w-4 text-primary" />
            {node.label}
          </div>
        ))}

        {targetRefs.map((ref, idx) => (
          <AnimatedBeam
            key={`beam-${nodes[idx].label}`}
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={ref}
            curvature={120}
            pathColor="rgba(255,255,255,0.5)"
            pathWidth={2.5}
            pathOpacity={0.9}
            gradientStartColor="rgba(255,255,255,0.8)"
            gradientStopColor="rgba(255,255,255,0.3)"
            duration={5 + idx * 0.2}
            delay={idx * 0.15}
          />
        ))}
      </div>
    </div>
  );
}
