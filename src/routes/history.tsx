import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, GitCompareArrows, RotateCcw, Trash2, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryBadge, DemoBadge, StatusBadge } from "@/components/water/Badges";
import { LoadingBlock, PageHeader, Panel } from "@/components/water/PageHeader";
import { deleteSample, removeDemoData, restoreDemoData } from "@/lib/db";
import { useAssessedSamples, type AssessedSample } from "@/lib/water/hooks";
import { PARAMETERS, PARAMETER_KEYS, formatValue, type ParameterKey } from "@/lib/water/parameters";
import { downloadBlob } from "@/lib/water/download";
import { MlStatusBadge } from "@/components/water/MlResultCard";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Analysis History – AquaSentinel AI" },
      { name: "description", content: "Saved water analyses with trend charts and side-by-side comparison of historical readings." },
      { property: "og:title", content: "Analysis History – AquaSentinel AI" },
      { property: "og:description", content: "Compare saved water samples and follow measurement trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

type Metric = "wqi" | ParameterKey;
const METRICS: { key: Metric; label: string; unit: string; band?: [number, number] }[] = [
  { key: "wqi", label: "Indicator index", unit: "/100", band: [70, 100] },
  { key: "ph", label: "pH", unit: "", band: [6.5, 8.5] },
  { key: "turbidity", label: "Turbidity", unit: "NTU", band: [0, 5] },
  { key: "dissolvedOxygen", label: "Dissolved oxygen", unit: "mg/L" },
  { key: "conductivity", label: "Conductivity", unit: "µS/cm", band: [0, 800] },
  { key: "temperature", label: "Temperature", unit: "°C", band: [10, 25] },
];
const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];

const metricValue = (d: AssessedSample, m: Metric) => (m === "wqi" ? d.assessment.wqi : d.sample[m]);

function HistoryPage() {
  const data = useAssessedSamples();
  const [site, setSite] = useState("all");
  const [metric, setMetric] = useState<Metric>("wqi");
  const [showDemo, setShowDemo] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);

  const sites = useMemo(() => [...new Set((data ?? []).map((d) => d.sample.siteName))].sort(), [data]);
  const filtered = useMemo(
    () => (data ?? []).filter((d) => (site === "all" || d.sample.siteName === site) && (showDemo || !d.sample.isDemo)),
    [data, site, showDemo],
  );

  const trend = useMemo(() => {
    if (site !== "all") {
      return filtered.map((d) => ({ x: new Date(d.sample.collectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), v: round(metricValue(d, metric)) }));
    }
    const g = new Map<string, number[]>();
    for (const d of filtered) {
      const k = d.sample.collectedAt.slice(0, 7);
      g.set(k, [...(g.get(k) ?? []), metricValue(d, metric)]);
    }
    return [...g.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, vs]) => ({
      x: new Date(`${k}-01`).toLocaleString("en-US", { month: "short", year: "2-digit" }),
      v: round(vs.reduce((s, v) => s + v, 0) / vs.length),
    }));
  }, [filtered, site, metric]);

  const compare = (data ?? []).filter((d) => d.sample.id !== undefined && selected.includes(d.sample.id));
  const toggle = (id: number) =>
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 4) {
        toast.info("You can compare up to 4 samples at once");
        return s;
      }
      return [...s, id];
    });

  const metricDef = METRICS.find((m) => m.key === metric)!;
  const rows = [...filtered].reverse();

  const exportCsv = () => {
    const head = ["id", "label", "site", "source", "collected", "latitude", "longitude", ...PARAMETER_KEYS, "index", "category", "investigate", "ml_status", "ml_prediction", "ml_checked_at", "demo"];
    const lines = filtered.map(({ sample: s, assessment: a }) =>
      [s.id, s.label, s.siteName, s.waterSource, s.collectedAt, s.latitude ?? "", s.longitude ?? "", ...PARAMETER_KEYS.map((k) => s[k]), a.wqi.toFixed(1), a.category, a.requiresInvestigation, s.mlResult?.status ?? "not checked", s.mlResult?.prediction ?? "", s.mlResult?.checkedAt ?? "", s.isDemo]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadBlob(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" }), "aquasentinel-history.csv");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="History"
        title="Saved analyses"
        description="Every sample you analyse is kept on this device. Follow trends over time, and tick up to four samples to compare them side by side."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download /> Export CSV</Button>
            <DemoDataMenu />
          </>
        }
      />

      {!data ? (
        <LoadingBlock />
      ) : (
        <>
          <Panel
            title="Measurement trend"
            description={site === "all" ? "Monthly average across all selected samples. The shaded band shows the reference range." : "Each sample at this site. The shaded band shows the reference range."}
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <select aria-label="Site" value={site} onChange={(e) => setSite(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All sites</option>
                {sites.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                {METRICS.map((m) => (
                  <button key={m.key} onClick={() => setMetric(m.key)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${metric === m.key ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={showDemo} onCheckedChange={(v) => setShowDemo(v === true)} /> Include demo data
              </label>
            </div>
            {trend.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No samples match these filters.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ left: -8, right: 12, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    {metricDef.band && <ReferenceArea y1={metricDef.band[0]} y2={metricDef.band[1]} fill="var(--eco)" fillOpacity={0.08} ifOverflow="hidden" />}
                    <XAxis dataKey="x" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip formatter={(v: number) => [`${v} ${metricDef.unit}`, metricDef.label]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="v" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3.5, fill: "var(--chart-1)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          {compare.length >= 2 && <ComparePanel items={compare} onClear={() => setSelected([])} />}

          <Panel
            title={`${rows.length} sample${rows.length === 1 ? "" : "s"}`}
            description={compare.length < 2 ? "Tick two to four samples to compare them." : `${compare.length} selected for comparison.`}
            actions={selected.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelected([])}><X /> Clear selection</Button>}
          >
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No samples yet. <Link to="/analysis" className="text-primary underline">Analyse one now</Link>.</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-2 font-medium"><GitCompareArrows className="size-4" /></th>
                      <th className="px-2 py-2 font-medium">Sample</th>
                      <th className="px-2 py-2 font-medium">Date</th>
                      {PARAMETER_KEYS.map((k) => <th key={k} className="px-2 py-2 text-right font-medium">{PARAMETERS[k].shortLabel}</th>)}
                      <th className="px-2 py-2 text-right font-medium">Index</th>
                      <th className="px-2 py-2 font-medium">Result</th>
                      <th className="px-2 py-2 font-medium" title="Isolation Forest machine-learning check">ML check</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ sample: s, assessment: a }) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-2 py-2.5"><Checkbox aria-label={`Select ${s.label} for comparison`} checked={selected.includes(s.id!)} onCheckedChange={() => toggle(s.id!)} /></td>
                        <td className="max-w-56 px-2 py-2.5">
                          <Link to="/samples/$id" params={{ id: String(s.id) }} className="block truncate font-medium text-foreground hover:text-primary">{s.label}</Link>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="truncate">{s.siteName}</span>{s.isDemo && <DemoBadge className="shrink-0 py-0" />}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">{new Date(s.collectedAt).toLocaleDateString("en-GB")}</td>
                        {PARAMETER_KEYS.map((k) => {
                          const st = a.parameters.find((p) => p.key === k)!.status;
                          return <td key={k} className={`px-2 py-2.5 text-right font-mono text-xs ${st === "normal" ? "text-foreground" : st === "watch" ? "text-warning-foreground" : "font-semibold text-status-poor"}`}>{formatValue(k, s[k])}</td>;
                        })}
                        <td className="px-2 py-2.5 text-right font-display font-bold tabular">{a.wqi.toFixed(0)}</td>
                        <td className="px-2 py-2.5"><CategoryBadge category={a.category} short /></td>
                        <td className="px-2 py-2.5">{s.mlResult ? <MlStatusBadge status={s.mlResult.status} /> : <span className="text-xs text-muted-foreground">Not checked</span>}</td>
                        <td className="px-2 py-2.5"><DeleteButton id={s.id!} label={s.label} onDeleted={() => setSelected((x) => x.filter((i) => i !== s.id))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function ComparePanel({ items, onClear }: { items: AssessedSample[]; onClear: () => void }) {
  const chart = PARAMETER_KEYS.map((k) => {
    const row: Record<string, string | number> = { param: PARAMETERS[k].shortLabel };
    items.forEach((d, i) => (row[`s${i}`] = Math.round(d.assessment.parameters.find((p) => p.key === k)!.subIndex)));
    return row;
  });
  return (
    <Panel title="Comparison" description="Raw readings and sub-index scores (0–100, higher is better) side by side." actions={<Button variant="ghost" size="sm" onClick={onClear}><X /> Close</Button>}>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3 text-xs font-medium uppercase text-muted-foreground">Parameter</th>
                {items.map((d, i) => (
                  <th key={d.sample.id} className="px-2 py-2 text-xs font-semibold">
                    <span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} />
                    {d.sample.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PARAMETER_KEYS.map((k) => (
                <tr key={k} className="border-b">
                  <td className="py-2 pr-3 text-muted-foreground">{PARAMETERS[k].label} <span className="text-xs">({PARAMETERS[k].unit})</span></td>
                  {items.map((d) => {
                    const p = d.assessment.parameters.find((x) => x.key === k)!;
                    return (
                      <td key={d.sample.id} className="px-2 py-2">
                        <span className="font-mono">{formatValue(k, p.value)}</span>
                        <div className="mt-1"><StatusBadge status={p.status} /></div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-3 font-medium">Indicator index</td>
                {items.map((d) => (
                  <td key={d.sample.id} className="px-2 py-2">
                    <span className="font-display text-lg font-bold tabular">{d.assessment.wqi.toFixed(0)}</span>
                    <div className="mt-1"><CategoryBadge category={d.assessment.category} short /></div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="param" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {items.map((d, i) => <Bar key={d.sample.id} dataKey={`s${i}`} name={d.sample.label} fill={SERIES_COLORS[i]} radius={[4, 4, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}

function DeleteButton({ id, label, onDeleted }: { id: number; label: string; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Delete ${label}`}><Trash2 className="text-muted-foreground" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this sample?</AlertDialogTitle>
          <AlertDialogDescription>“{label}” and its assessment will be removed from this device. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await deleteSample(id);
              onDeleted();
              toast.success("Sample deleted");
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DemoDataMenu() {
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="outline"><RotateCcw /> Restore demo data</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore demonstration data?</AlertDialogTitle>
            <AlertDialogDescription>The synthetic demo samples will be reloaded. Your own samples are kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await restoreDemoData(); toast.success("Demo data restored"); }}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="ghost"><Trash2 /> Remove demo data</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all demonstration data?</AlertDialogTitle>
            <AlertDialogDescription>Only synthetic demo samples are removed; your own samples stay. You can restore the demo data later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await removeDemoData(); toast.success("Demo data removed"); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}
