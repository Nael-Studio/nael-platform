import { ShieldIcon, WorkflowIcon, SparklesIcon, Share2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    icon: ShieldIcon,
    title: "Better Auth everywhere",
    description:
      "Shared session middleware across REST + GraphQL plus drop-in multi-tenant guards, proxies, and tenant-resolved config.",
  },
  {
    icon: WorkflowIcon,
    title: "Dapr microservices",
    description:
      "Decorators map directly to Dapr pub/sub patterns so workers, cron jobs, and message handlers stay Bun-native.",
  },
  {
    icon: Share2Icon,
    title: "Federation ready",
    description:
      "Ship Apollo Federation subgraphs and gateways from the same factory while sharing DI contexts and middleware.",
  },
  {
    icon: SparklesIcon,
    title: "CLI automation",
    description:
      "`nl new` scaffolds opinated services and `nl g` commands generate modules, controllers, resolvers, and workers.",
  },
];

export function FeatureHighlights() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {highlights.map(({ icon: Icon, title, description }) => (
        <Card key={title} className="border-border/70">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
