import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, ComposedChart } from "recharts";
import { Activity, AlertTriangle, ArrowRight, Droplets, FlaskConical, MapPin, Map as MapIcon } from "lucide-react";
import heroImg from "@/assets/river-hero.jpg";
import { Button } from "@/components/ui/button";
import { CategoryBadge, DemoBadge } from "@/components/water/Badges";
import { MlStatusBadge } from "@/components/water/MlResultCard";
import { DemoNotice, LoadingBlock, Panel } from "@/components/water/PageHeader";
import { CATEGORY_STYLES } from "@/components/water/status";
import { useAssessedSamples } from "@/lib/water/hooks";
import { CATEGORY_LABELS, type Category } from "@/lib/water/model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AquaSentinel AI – Water Quality Dashboard" },
      { name: "description", content: "Overview of analysed water samples, samples needing investigation and water-quality trends, supporting UN SDG 6." },
      { property: "og:title", content: "AquaSentinel AI – Water Quality Dashboard" },
      { property: "og:description", content: "Track water samples, unusual readings and quality trends for UN SDG 6." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const CATS: Category[] = ["excellent", "good", "fair", "poor", "very-poor"];

function Dashboard() {
  const data = useAssessedSamples();

  const stats = useMemo(() => {
    if (!data) return null;
    const total = data.length;
    const investigate = data.filter((d) => d.assessment.requiresInvestigation).length;
    const avg = total ? data.reduce((s, d) => s + d.assessment.wqi, 0) / total : 0;
    const sites = new Set(data.map((d) => d.sample.siteName)).size;
    const byMonth = new Map<string, { sum: number; n: number; inv: number }>();
    for (const d of data) {
      const k = d.sample.collectedAt.slice(0, 7);
      const e = byMonth.get(k) ?? { sum: 0, n: 0, inv: 0 };
      e.sum += d.assessment.wqi;
      e.n++;
      if (d.assessment.requiresInvestigation) e.inv++;
      byMonth.set(k, e);
    }
    const trend = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, e]) => ({
        month: new Date(`${k}-01`).toLocaleString("en-US", { month: "short", year: "2-digit" }),
        wqi: Math.round((e.sum / e.n) * 10) / 10,
        investigate: e.inv,
      }));
    const dist = CATS.map((c) => ({ category: c, count: data.filter((d) => d.assessment.category === c).length }));
    const recent = [...data].sort((a, b) => b.sample.createdAt.localeCompare(a.sample.createdAt)).slice(0, 6);
    return { total, investigate, avg, sites, trend, dist, recent };
  }, [data]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl shadow-elevated">
        <img src={heroImg} alt="Aerial view of a clear river winding through green wetlands" width={1600} height={800} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="absolute inset-0 ripple-grid opacity-40" />
        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
            <span className="flex size-5 items-center justify-center rounded-full bg-eco font-display text-[11px] font-bold text-eco-foreground">6</span>
            UN Sustainable Development Goal 6 · Clean Water and Sanitation
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight text-primary-foreground md:text-5xl">
            AquaSentinel AI
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
            Understand water quality from five field measurements. Spot unusual readings, see what drives each
            result and produce clear reports — with a transparent, documented model.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to="/analysis"><FlaskConical /> Analyse a sample</Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link to="/map"><MapIcon /> Explore the map</Link>
            </Button>
          </div>
        </div>
      </section>

      <DemoNotice />

      {!stats ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Droplets} label="Samples analysed" value={stats.total.toString()} hint="All saved samples" />
            <StatCard icon={AlertTriangle} label="Need further investigation" value={stats.investigate.toString()} hint={`${stats.total ? Math.round((stats.investigate / stats.total) * 100) : 0}% of samples`} tone="warn" />
            <StatCard icon={Activity} label="Average indicator index" value={stats.avg.toFixed(1)} hint="Out of 100" />
            <StatCard icon={MapPin} label="Monitoring sites" value={stats.sites.toString()} hint="Distinct locations" tone="eco" />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title="Water-quality trend" description="Monthly average indicator index (line) and samples needing investigation (bars).">
              {stats.trend.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No samples yet.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.trend} margin={{ left: -16, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="wqiFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="w" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="i" orientation="right" allowDecimals={false} hide />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
                      <Bar yAxisId="i" dataKey="investigate" name="Need investigation" fill="var(--status-poor)" fillOpacity={0.35} radius={[4, 4, 0, 0]} barSize={18} />
                      <Area yAxisId="w" type="monotone" dataKey="wqi" name="Avg. index" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#wqiFill)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Classification mix" description="How saved samples are classified.">
              <div className="space-y-3">
                {stats.dist.map((d) => (
                  <div key={d.category}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-foreground">{CATEGORY_LABELS[d.category]}</span>
                      <span className="tabular font-medium text-muted-foreground">{d.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${CATEGORY_STYLES[d.category].bg}`} style={{ width: `${stats.total ? (d.count / stats.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                    <Area type="monotone" dataKey="investigate" stroke="var(--status-poor)" fill="var(--status-poor)" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-center text-xs text-muted-foreground">Investigations per month</p>
              </div>
            </Panel>
          </div>

          <Panel
            title="Recent analyses"
            description="Latest saved samples. Open one to see the full assessment."
            actions={
              <Button asChild variant="outline" size="sm">
                <Link to="/history">View all history <ArrowRight /></Link>
              </Button>
            }
          >
            {stats.recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No samples yet. <Link to="/analysis" className="font-medium text-primary underline">Analyse your first sample</Link>.
              </p>
            ) : (
              <ul className="divide-y">
                {stats.recent.map(({ sample, assessment }) => (
                  <li key={sample.id}>
                    <Link
                      to="/samples/$id"
                      params={{ id: String(sample.id) }}
                      className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                    >
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold tabular ${CATEGORY_STYLES[assessment.category].soft} ${CATEGORY_STYLES[assessment.category].text}`}>
                        {assessment.wqi.toFixed(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{sample.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sample.siteName} · {new Date(sample.collectedAt).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      {sample.isDemo && <DemoBadge />}
                      {sample.mlResult && <MlStatusBadge status={sample.mlResult.status} />}
                      {assessment.requiresInvestigation && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-status-poor"><AlertTriangle className="size-3.5" /> Investigate</span>
                      )}
                      <CategoryBadge category={assessment.category} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = "primary" }: { icon: typeof Droplets; label: string; value: string; hint: string; tone?: "primary" | "warn" | "eco" }) {
  const toneCls = tone === "warn" ? "bg-status-poor/12 text-status-poor" : tone === "eco" ? "bg-accent text-accent-foreground" : "bg-secondary text-primary";
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-lg ${toneCls}`}><Icon className="size-4.5" /></span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
