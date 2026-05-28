import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Gauge, TrendingUp, Building2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp, computePropertyMetrics } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SuggestedAction = "Drop price 5%" | "Push to outreach" | "Flag for owner";

type AlertItem = {
  id: string;
  name: string;
  area: string;
  pressure: number;
  demand: number;
  vacant: number;
  pricingIssue: boolean;
  action: SuggestedAction;
};

const ALERT_RULES: Record<string, { pressure: number; pricingIssue: boolean; action: SuggestedAction }> = {
  "Gharpayy Koramangala 5B": { pressure: 58, pricingIssue: true, action: "Drop price 5%" },
  "Gharpayy Indiranagar 100ft": { pressure: 69, pricingIssue: true, action: "Flag for owner" },
  "Gharpayy Whitefield ITPL": { pressure: 54, pricingIssue: true, action: "Push to outreach" },
  "Gharpayy Koramangala 8B": { pressure: 55, pricingIssue: true, action: "Drop price 5%" },
  "Gharpayy Whitefield Hope Farm": { pressure: 57, pricingIssue: false, action: "Push to outreach" },
};

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Property Alert Queue - Gharpayy" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const { properties, leads, tours } = useApp();
  const metrics = useMemo(() => computePropertyMetrics(properties, leads, tours), [properties, leads, tours]);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const alerts = useMemo<AlertItem[]>(() => {
    return metrics
      .filter((m) => ALERT_RULES[m.property.name])
      .map((m) => {
        const rule = ALERT_RULES[m.property.name];
        return {
          id: m.property.id,
          name: m.property.name.replace("Gharpayy ", ""),
          area: m.property.area,
          pressure: rule.pressure,
          demand: m.demandScore,
          vacant: m.property.vacantBeds,
          pricingIssue: rule.pricingIssue,
          action: rule.action,
        };
      })
      .filter((item) => item.pricingIssue || item.pressure > 50)
      .sort((a, b) => b.pressure - a.pressure);
  }, [metrics]);

  const needsAction = alerts.filter((a) => !resolvedIds.includes(a.id));
  const resolved = alerts.filter((a) => resolvedIds.includes(a.id));

  const markResolved = (id: string) => {
    setResolvedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        <header>
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">Flow Ops</div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Property Alert Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor pressure and pricing-risk properties and close actions quickly.</p>
        </header>

        <Tabs defaultValue="needs-action" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="needs-action">Needs Action</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value="needs-action" className="space-y-3">
            {needsAction.length === 0 ? (
              <EmptyState text="No properties need action right now." />
            ) : (
              needsAction.map((item) => (
                <AlertCard key={item.id} item={item} onResolve={() => markResolved(item.id)} />
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-3">
            {resolved.length === 0 ? (
              <EmptyState text="No resolved actions yet." />
            ) : (
              resolved.map((item) => (
                <section key={item.id} className="rounded-xl border border-success/30 bg-success/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-foreground">{item.name}</h2>
                      <p className="text-xs text-muted-foreground">{item.area}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[10px] font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolved
                    </span>
                  </div>
                </section>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function AlertCard({ item, onResolve }: { item: AlertItem; onResolve: () => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{item.name}</h2>
          <p className="text-xs text-muted-foreground">{item.area}</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
          <AlertTriangle className="h-3 w-3" />
          Needs Action
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <Stat icon={Gauge} label="Pressure" value={item.pressure} />
        <Stat icon={TrendingUp} label="Demand" value={item.demand} />
        <Stat icon={Building2} label="Vacant rooms" value={item.vacant} />
        <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Flag</div>
          <div className={cn("text-xs font-medium mt-0.5", item.pricingIssue ? "text-destructive" : "text-muted-foreground")}>
            {item.pricingIssue ? "Pricing issue" : "Pressure high"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">
          {item.action}
        </span>
        <button
          onClick={onResolve}
          className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
        >
          Action Taken <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium">{value}</span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
