import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { useMountedNow } from "@/hooks/use-now";
import { buildDoNextQueue, computeTcmPerformance, type NextAction } from "@/lib/engine";
import { useMemo } from "react";
import { QuickActionRow } from "@/components/QuickActionRow";
import { format, formatDistanceToNow } from "date-fns";
import { Sun, Flame, AlertTriangle, Phone, Trophy, Zap, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { KpiCard, ConfidenceBar } from "@/components/atoms";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today — Gharpayy" },
      { name: "description", content: "Your morning command center. The exact next action, ranked by impact." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { role, currentTcmId, leads, tours, followUps, tcms, completeFollowUp, updatePostTour, addFollowUp, setDecision } = useApp();
  const [now, mounted] = useMountedNow(15_000);

  const filterTcm = role === "tcm" ? currentTcmId : undefined;
  const queue = useMemo(
    () => buildDoNextQueue(leads, tours, followUps, now || Date.now(), filterTcm),
    [leads, tours, followUps, now, filterTcm],
  );

  const me = role === "tcm" ? tcms.find((t) => t.id === currentTcmId) : null;
  const perf = me ? computeTcmPerformance(me.id, leads, tours, followUps, now || Date.now()) : null;

  const top = queue.slice(0, 12);
  const grouped = groupByKind(queue);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Sun className="h-3.5 w-3.5" />
              <span className="min-h-[1em]">{mounted ? format(new Date(now), "EEEE, MMMM d · h:mm a") : "\u00a0"}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {mounted ? greeting(now) : "Hello"}{me ? `, ${me.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-sm text-muted-foreground">
              {top.length === 0
                ? "Inbox zero. Nothing pending right now."
                : `${queue.length} action${queue.length > 1 ? "s" : ""} ranked. Start at the top.`}
            </p>
          </div>
          <Link to="/leads" className="text-xs text-accent inline-flex items-center gap-1">
            All leads <ArrowUpRight className="h-3 w-3" />
          </Link>
        </header>

        {/* Personal KPIs for TCM */}
        {perf && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="My leads" value={perf.leadCount} sub={`${perf.toursDone} tours done`} />
            <KpiCard label="My conversion" value={`${perf.conversion}%`} sub={`${perf.bookings} booked`} tone="success" />
            <KpiCard label="Pending post-tour" value={perf.pendingPostTour} sub="Fill now" tone={perf.pendingPostTour ? "destructive" : "default"} />
            <KpiCard label="Discipline score" value={`${perf.discipline}`} sub="0–100" tone={perf.discipline >= 75 ? "success" : perf.discipline >= 50 ? "warning" : "destructive"} />
          </div>
        )}

        {/* The Queue */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-semibold">Do this next</h2>
              <span className="text-[11px] text-muted-foreground font-mono">live · refreshes every 15s</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <Legend color="bg-destructive" label={`${grouped.urgent} urgent`} />
              <Legend color="bg-warning" label={`${grouped.today} today`} />
              <Legend color="bg-accent" label={`${grouped.hot} hot`} />
            </div>
          </header>
          {top.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Trophy className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="font-display font-semibold">Inbox zero.</div>
              <div className="text-xs text-muted-foreground mt-1">Take a breath. New leads will land here automatically.</div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {top.map((a) => {
                const lead = leads.find((l) => l.id === a.leadId);
                if (!lead) return null;
                const tone = toneFor(a);
                const onDone = a.kind === "follow-up-overdue" || a.kind === "follow-up-today"
                  ? () => {
                      const f = followUps.find((x) => x.leadId === a.leadId && !x.done);
                      if (f) completeFollowUp(f.id);
                    }
                  : undefined;
                const dueLabel = mounted && a.dueAt
                  ? formatDistanceToNow(new Date(a.dueAt), { addSuffix: true })
                  : undefined;
                return (
                  <QuickActionRow
                    key={`${a.leadId}-${a.kind}`}
                    lead={lead}
                    reason={a.reason}
                    accent={tone}
                    dueLabel={dueLabel}
                    onDone={onDone}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Hot leads card */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Mini title="Critical now" icon={AlertTriangle} accent="destructive"
            count={grouped.urgent}
            items={queue.filter((a) => a.kind === "post-tour-overdue" || a.kind === "first-response").slice(0, 5)}
            leads={leads}
          />
          <Mini title="Hot pipeline" icon={Flame} accent="accent"
            count={grouped.hot}
            items={queue.filter((a) => leads.find((l) => l.id === a.leadId)?.intent === "hot").slice(0, 5)}
            leads={leads}
          />
        </section>

        {/* Post-Tour Pipeline */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm font-semibold">Post-Tour Pipeline</h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{leads.filter((l) => l.stage === "tour-done").length}</span>
          </header>
          <div className="p-3 space-y-2">
            {leads.filter((l) => l.stage === "tour-done").map((l) => {
              const leadTours = tours.filter((t) => t.leadId === l.id && t.status === "completed").sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
              const tour = leadTours[0];
              if (!tour) return null;
              const formFilled = !!tour.postTour.filledAt;
              const follow = followUps.find((f) => f.tourId === tour.id);
              const followDone = !!follow && follow.done;
              const outcomeLogged = !!tour.decision;

              const firstPending = !formFilled ? "form" : !followDone ? "follow" : !outcomeLogged ? "outcome" : null;

              const handleMarkDone = async () => {
                if (!firstPending) return;
                if (firstPending === "form") {
                  updatePostTour(tour.id, { filledAt: new Date().toISOString() });
                  toast.success("Post-tour form marked filled");
                } else if (firstPending === "follow") {
                  if (follow) {
                    completeFollowUp(follow.id);
                    toast.success("Follow-up marked done");
                  } else {
                    addFollowUp({ leadId: l.id, tourId: tour.id, tcmId: tour.tcmId, dueAt: new Date().toISOString(), priority: "medium", reason: "Post-tour follow-up" });
                    // find recently added follow-up and complete it via store state
                    const f = (useApp as any).getState().followUps.find((f2: any) => f2.tourId === tour.id && !f2.done);
                    if (f) completeFollowUp(f.id);
                    toast.success("Follow-up sent and marked done");
                  }
                } else if (firstPending === "outcome") {
                  setDecision(tour.id, "thinking");
                  toast.success("Outcome logged (thinking)");
                }
              };

              return (
                <div key={l.id} className="rounded-md border border-border bg-card p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-sm truncate">{l.name}</div>
                      <div className="ml-2"><ConfidenceBar value={l.confidence} /></div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <Step label="Form Filled" done={formFilled} />
                      <Step label="Follow-up Sent" done={followDone} />
                      <Step label="Outcome Logged" done={outcomeLogged} />
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {firstPending ? (
                      <Button size="sm" onClick={handleMarkDone}>Mark Done</Button>
                    ) : (
                      <div className="text-sm text-success font-medium">All done</div>
                    )}
                  </div>
                </div>
              );
            })}
            {leads.filter((l) => l.stage === "tour-done").length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">No post-tour candidates.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Mini({
  title, icon: Icon, accent, count, items, leads,
}: {
  title: string;
  icon: typeof Flame;
  accent: "destructive" | "accent";
  count: number;
  items: NextAction[];
  leads: Lead[];
}) {
  const { selectLead } = useApp();
  const cls = accent === "destructive" ? "text-destructive" : "text-accent";
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${cls}`} />
          <h2 className="font-display text-sm font-semibold">{title}</h2>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">{count}</span>
      </header>
      <div className="p-2">
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">Nothing here.</div>
        )}
        {items.map((a) => {
          const lead = leads.find((l) => l.id === a.leadId);
          if (!lead) return null;
          return (
            <button
              key={`${a.leadId}-${a.kind}`}
              onClick={() => selectLead(lead.id)}
              className="w-full text-left rounded-md px-2 py-1.5 hover:bg-accent/5 transition-colors flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{lead.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{a.reason}</div>
              </div>
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} /> {label}
    </span>
  );
}

function Step({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" />
      )}
      <div className={`text-sm ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</div>
    </div>
  );
}

function greeting(ts: number) {
  const h = new Date(ts).getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function toneFor(a: NextAction): "destructive" | "warning" | "accent" | "default" {
  if (a.kind === "post-tour-overdue" || a.kind === "first-response" || a.kind === "follow-up-overdue") return "destructive";
  if (a.kind === "no-follow-up") return "warning";
  if (a.kind === "tour-today" || a.kind === "follow-up-today") return "accent";
  return "default";
}

function groupByKind(queue: NextAction[]) {
  return {
    urgent: queue.filter((a) =>
      a.kind === "post-tour-overdue" || a.kind === "first-response" || a.kind === "follow-up-overdue",
    ).length,
    today: queue.filter((a) => a.kind === "follow-up-today" || a.kind === "tour-today").length,
    hot: queue.filter((a) => a.score >= 850).length,
  };
}
