import { createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { ArrowRight, MapPin, MapPinOff } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { CategoryBadge, DemoBadge } from "@/components/water/Badges";
import { DemoNotice, LoadingBlock, PageHeader, Panel } from "@/components/water/PageHeader";
import { CATEGORY_STYLES } from "@/components/water/status";
import type { MapSite } from "@/components/water/SampleMap";
import { useAssessedSamples, type AssessedSample } from "@/lib/water/hooks";
import { CATEGORY_LABELS, type Category } from "@/lib/water/model";
import { PARAMETERS, PARAMETER_KEYS, formatValue } from "@/lib/water/parameters";

const SampleMap = lazy(() => import("@/components/water/SampleMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Water Quality Map – AquaSentinel AI" },
      { name: "description", content: "Interactive map of water sample locations coloured by water-quality classification." },
      { property: "og:title", content: "Water Quality Map – AquaSentinel AI" },
      { property: "og:description", content: "Explore sample locations and results on an interactive map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

const CATS: Category[] = ["excellent", "good", "fair", "poor", "very-poor"];

function MapPage() {
  const hydrated = useHydrated();
  const data = useAssessedSamples();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const onSelect = useCallback((k: string) => setSelected(k), []);

  const { sites, bySite, unmapped } = useMemo(() => {
    const bySite = new Map<string, AssessedSample[]>();
    let unmapped = 0;
    for (const d of data ?? []) {
      if (d.sample.latitude === null || d.sample.longitude === null) {
        unmapped++;
        continue;
      }
      const key = `${d.sample.siteName}|${d.sample.latitude.toFixed(4)}|${d.sample.longitude.toFixed(4)}`;
      bySite.set(key, [...(bySite.get(key) ?? []), d]);
    }
    const sites: MapSite[] = [...bySite.entries()].map(([key, list]) => {
      const latest = list[list.length - 1]!;
      return { key, name: latest.sample.siteName, lat: latest.sample.latitude!, lng: latest.sample.longitude!, wqi: latest.assessment.wqi, category: latest.assessment.category, count: list.length };
    });
    return { sites, bySite, unmapped };
  }, [data]);

  const visible = filter === "all" ? sites : sites.filter((s) => s.category === filter);
  const sel = selected ? bySite.get(selected) : undefined;
  const latest = sel?.[sel.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Water quality map"
        title="Explore sample locations"
        description="Each circle is a monitoring site, coloured by its most recent classification. Select a site to see its readings and trend."
      />
      <DemoNotice />

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All sites ({sites.length})</FilterChip>
        {CATS.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            <span className={`size-2.5 rounded-full ${CATEGORY_STYLES[c].dot}`} /> {CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="h-[460px] overflow-hidden rounded-xl border bg-muted shadow-card md:h-[600px]">
          {hydrated && data ? (
            <Suspense fallback={<LoadingBlock label="Loading map…" />}>
              <SampleMap sites={visible} selected={selected} onSelect={onSelect} />
            </Suspense>
          ) : (
            <LoadingBlock label="Loading map…" />
          )}
        </div>

        <div className="space-y-4">
          {!latest || !sel ? (
            <Panel title="Select a site">
              <p className="text-sm text-muted-foreground">Click a circle on the map, or choose a site below.</p>
              <ul className="mt-4 space-y-1">
                {visible.map((s) => (
                  <li key={s.key}>
                    <button onClick={() => setSelected(s.key)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted">
                      <span className={`size-3 rounded-full ${CATEGORY_STYLES[s.category].dot}`} />
                      <span className="flex-1 truncate text-foreground">{s.name}</span>
                      <span className="tabular text-muted-foreground">{s.wqi.toFixed(0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {unmapped > 0 && (
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><MapPinOff className="size-3.5" /> {unmapped} sample{unmapped === 1 ? " has" : "s have"} no coordinates and {unmapped === 1 ? "is" : "are"} not shown.</p>
              )}
            </Panel>
          ) : (
            <Panel
              title={latest.sample.siteName}
              description={`${sel.length} sample${sel.length === 1 ? "" : "s"} · latest ${new Date(latest.sample.collectedAt).toLocaleDateString("en-GB")}`}
              actions={<Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-3xl font-bold tabular text-foreground">{latest.assessment.wqi.toFixed(0)}</span>
                <CategoryBadge category={latest.assessment.category} />
                {latest.sample.isDemo && <DemoBadge />}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {latest.sample.latitude?.toFixed(4)}, {latest.sample.longitude?.toFixed(4)}</p>
              <dl className="mt-4 space-y-1.5 text-sm">
                {PARAMETER_KEYS.map((k) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-muted-foreground">{PARAMETERS[k].label}</dt>
                    <dd className="font-mono text-foreground">{formatValue(k, latest.sample[k])} <span className="text-xs text-muted-foreground">{PARAMETERS[k].unit}</span></dd>
                  </div>
                ))}
              </dl>
              {sel.length > 1 && (
                <div className="mt-4 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sel.map((d) => ({ date: new Date(d.sample.collectedAt).toLocaleString("en-US", { month: "short" }), wqi: Math.round(d.assessment.wqi) }))}>
                      <XAxis dataKey="date" interval={0} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Line type="monotone" dataKey="wqi" name="Index" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Samples at this site</p>
                {[...sel].reverse().map((d) => (
                  <Link key={d.sample.id} to="/samples/$id" params={{ id: String(d.sample.id) }} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <span className="text-foreground">{new Date(d.sample.collectedAt).toLocaleDateString("en-GB")}</span>
                    <span className={`tabular font-medium ${CATEGORY_STYLES[d.assessment.category].text}`}>{d.assessment.wqi.toFixed(0)} <ArrowRight className="inline size-3" /></span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}
