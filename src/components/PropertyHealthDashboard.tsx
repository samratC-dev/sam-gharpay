import { useMemo } from "react";
import { AlertCircle, AlertTriangle, Home, TrendingUp } from "lucide-react";
import { useApp, computePropertyMetrics } from "@/lib/store";
import { cn } from "@/lib/utils";

type Status = "healthy" | "watch" | "critical";

type HealthCard = {
  id: string;
  name: string;
  area: string;
  occupancyPct: number;
  revenueMonth: number;
  pipelineLeads: number;
  demandScore: number;
  vacantRooms: number;
  totalRooms: number;
  status: Status;
};

const INVENTORY_NAMES = new Set([
  "Gharpayy Koramangala 5B",
  "Gharpayy Indiranagar 100ft",
  "Gharpayy HSR Sector 2",
  "Gharpayy Whitefield ITPL",
  "Gharpayy BTM 2nd Stage",
  "Gharpayy Koramangala 8B",
  "Gharpayy Whitefield Hope Farm",
]);

export function PropertyHealthDashboard() {
  const { properties, leads, tours } = useApp();

  const cards = useMemo(() => {
    const metrics = computePropertyMetrics(properties, leads, tours);
    const scoped = metrics.filter((m) => INVENTORY_NAMES.has(m.property.name));
    const mapped: HealthCard[] = scoped.map((m) => {
      const occupancyPct = m.occupancyPct;
      const demandScore = m.demandScore;
      const revenueMonth = (m.property.totalBeds - m.property.vacantBeds) * m.property.pricePerBed;
      const pipelineLeads = m.leadCount;
      const vacantRooms = m.property.vacantBeds;
      const totalRooms = m.property.totalBeds;

      let status: Status = "healthy";
      if (occupancyPct < 60 || demandScore < 50) {
        status = "critical";
      } else if (
        (occupancyPct >= 60 && occupancyPct <= 85) ||
        (demandScore >= 50 && demandScore <= 70)
      ) {
        status = "watch";
      }

      return {
        id: m.property.id,
        name: m.property.name.replace("Gharpayy ", ""),
        area: m.property.area,
        occupancyPct,
        revenueMonth,
        pipelineLeads,
        demandScore,
        vacantRooms,
        totalRooms,
        status,
      };
    });

    const order = { critical: 0, watch: 1, healthy: 2 } as const;
    return mapped.sort((a, b) => order[a.status] - order[b.status]);
  }, [properties, leads, tours]);

  const summary = useMemo(() => {
    const totalProperties = cards.length;
    const propertiesNeedingAttention = cards.filter((c) => c.status !== "healthy").length;
    const totalVacantRooms = cards.reduce((sum, c) => sum + c.vacantRooms, 0);
    return { totalProperties, propertiesNeedingAttention, totalVacantRooms };
  }, [cards]);

  const statusMeta = (status: Status) => {
    if (status === "healthy") return { icon: "🟢", label: "Healthy", cls: "text-success border-success/30 bg-success/10" };
    if (status === "watch") return { icon: "🟡", label: "Watch", cls: "text-warning border-warning/30 bg-warning/10" };
    return { icon: "🔴", label: "Critical", cls: "text-destructive border-destructive/30 bg-destructive/10" };
  };

  return (
    <div className="space-y-6 pb-12">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">Property Owner</div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Property Health Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Occupancy, demand, pipeline and revenue snapshot for your inventory.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-accent" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Properties</div>
          </div>
          <div className="text-3xl font-display font-semibold">{summary.totalProperties}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Properties Needing Attention</div>
          </div>
          <div className="text-3xl font-display font-semibold text-warning">{summary.propertiesNeedingAttention}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Watch + Critical</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-info" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Vacant Rooms</div>
          </div>
          <div className="text-3xl font-display font-semibold">{summary.totalVacantRooms}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const badge = statusMeta(card.status);
          return (
            <section
              key={card.id}
              className={cn(
                "rounded-lg border bg-card p-4",
                card.status === "critical" && "border-destructive/30 bg-destructive/5",
                card.status === "watch" && "border-warning/30 bg-warning/5",
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{card.name}</h2>
                  <div className="text-xs text-muted-foreground truncate">{card.area}</div>
                </div>
                <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold", badge.cls)}>
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <Metric label="Occupancy" value={`${card.occupancyPct}%`} />
                <Metric label="Revenue (mo)" value={`₹${Math.round(card.revenueMonth / 1000)}k`} mono />
                <Metric label="Pipeline Leads" value={card.pipelineLeads} />
                <Metric label="Demand Score" value={`${card.demandScore}/100`} />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2">
                <div className="text-xs">
                  <div className="text-muted-foreground">Vacant rooms</div>
                  <div className="text-sm font-semibold mt-0.5 font-mono">
                    {card.vacantRooms}/{card.totalRooms}
                  </div>
                </div>
                {card.status === "critical" && (
                  <button className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors">
                    <AlertCircle className="h-3 w-3" />
                    Request Pricing Review
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded border border-border bg-muted/20 px-2 py-1.5">
      <div className="uppercase tracking-wider text-muted-foreground text-[9px]">{label}</div>
      <div className={cn("text-sm font-semibold mt-0.5", mono && "font-mono")}>{value}</div>
    </div>
  );
}
