import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, CheckCircle2, FileText, FlaskConical, Gauge, Info, Lightbulb, Sigma } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { CategoryBadge, DemoBadge, StatusBadge } from "@/components/water/Badges";
import { LoadingBlock, PageHeader, Panel } from "@/components/water/PageHeader";
import { NotFoundSample } from "@/components/water/NotFoundSample";
import { PdfButton, pdfFilename } from "@/components/water/PdfButton";
import { SafetyNotice } from "@/components/water/SafetyNotice";
import { CONFIDENCE_LABELS, STATUS_STYLES } from "@/components/water/status";
import { useSampleAssessment } from "@/components/water/useSampleAssessment";
import { WqiGauge } from "@/components/water/WqiGauge";
import { MlResultPanel } from "@/components/water/MlResultCard";
import { useMlCheck } from "@/components/water/useMlCheck";
import { saveMlResult } from "@/lib/db";
import { toast } from "sonner";
import { OUTLIER_MIN_HISTORY, type Finding } from "@/lib/water/model";
import { PARAMETERS, formatValue } from "@/lib/water/parameters";
import { buildReport } from "@/lib/water/report";
import { SOURCE_LABELS } from "@/lib/water/validation";

export const Route = createFileRoute("/samples/$id")({
  head: () => ({
    meta: [
      { title: "Sample Assessment – AquaSentinel AI" },
      { name: "description", content: "Explained water-quality assessment: indicator index, unusual readings, contributing parameters and confidence." },
      { property: "og:title", content: "Sample Assessment – AquaSentinel AI" },
      { property: "og:description", content: "Explained water-quality assessment for one water sample." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SamplePage,
});

const FINDING_ICON = { reference: Gauge, statistical: Sigma, pattern: Lightbulb } as const;
const FINDING_KIND = { reference: "Reference range", statistical: "Statistical outlier", pattern: "Possible cause" } as const;

function SamplePage() {
  const { id } = Route.useParams();
  const result = useSampleAssessment(id);
  const ml = useMlCheck();
  if (result.loading) return <LoadingBlock label="Loading sample…" />;
  if (!result.sample) return <NotFoundSample />;
  const { sample, assessment: a } = result;
  const report = buildReport(sample, a);
  const u = a.uncertainty!;
  const runMl = async () => {
    const out = await ml.run({ conductivity: sample.conductivity, turbidity: sample.turbidity, temperature: sample.temperature });
    if (out.ok && sample.id !== undefined) {
      await saveMlResult(sample.id, out.result);
      toast.success(`Model result: ${out.result.status}`);
    } else if (!out.ok) {
      toast.error("Model check failed", { description: out.message });
    }
  };
  const contrib = a.parameters
    .map((p) => ({ name: PARAMETERS[p.key].shortLabel, share: Math.round(p.deficitShare * 1000) / 10, status: p.status }))
    .sort((x, y) => y.share - x.share);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI water-quality assessment"
        title={sample.label}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {sample.siteName} · {SOURCE_LABELS[sample.waterSource]} · collected {new Date(sample.collectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            {sample.isDemo && <DemoBadge />}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline"><Link to="/reports/$id" params={{ id }}><FileText /> View report</Link></Button>
            <PdfButton report={report} assessment={a} filename={pdfFilename(sample.label)} />
          </>
        }
      />

      <SafetyNotice compact />

      <MlResultPanel result={sample.mlResult} running={ml.running} elapsed={ml.elapsed} error={ml.error} onRun={() => void runMl()} />

      <h2 className="pt-2 text-lg font-semibold text-foreground">Rule-based indicator assessment</h2>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel>
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Indicator index</p>
            <div className="my-3"><WqiGauge value={a.wqi} category={a.category} /></div>
            <CategoryBadge category={a.category} className="text-sm" />
            {a.guardApplied && (
              <p className="mt-3 text-xs text-muted-foreground">
                Classification lowered because at least one parameter is far outside its range, even though the average score is higher.
              </p>
            )}
            <div className={`mt-5 w-full rounded-lg p-3 text-left text-sm ${a.requiresInvestigation ? "bg-status-poor/12 text-status-poor" : "bg-status-excellent/12 text-status-excellent"}`}>
              <p className="flex items-center gap-2 font-semibold">
                {a.requiresInvestigation ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                {a.requiresInvestigation ? "Further investigation recommended" : "No indicator needs urgent follow-up"}
              </p>
            </div>
          </div>
          <div className="mt-5 border-t pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><BarChart3 className="size-4 text-primary" /> {CONFIDENCE_LABELS[u.level]}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-ocean" style={{ width: `${u.stability * 100}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {(u.stability * 100).toFixed(0)}% of {u.draws.toLocaleString()} simulations with typical meter error gave the same classification.
              Likely index range (90%): <span className="tabular font-medium text-foreground">{u.low.toFixed(0)}–{u.high.toFixed(0)}</span>.
            </p>
          </div>
        </Panel>

        <Panel title="Parameter breakdown" description="Each reading is converted to a 0–100 sub-index, then weighted to form the overall index.">
          <div className="grid gap-3 md:grid-cols-2">
            {a.parameters.map((p) => {
              const def = PARAMETERS[p.key];
              return (
                <div key={p.key} className="rounded-lg border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{def.label}</p>
                      <p className="mt-0.5 font-mono text-xl font-medium text-foreground">
                        {formatValue(p.key, p.value)} <span className="text-xs text-muted-foreground">{def.unit}</span>
                      </p>
                      {p.key === "dissolvedOxygen" && (
                        <p className="text-xs text-muted-foreground">{a.doSaturationPercent.toFixed(0)}% of saturation ({a.doSaturationMgL.toFixed(2)} mg/L max at {sample.temperature} °C)</p>
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${STATUS_STYLES[p.status].bar}`} style={{ width: `${p.subIndex}%` }} />
                    </div>
                    <span className="w-16 text-right font-mono text-xs text-muted-foreground">{p.subIndex.toFixed(0)}/100</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Reference: {def.referenceText} · weight {(p.weight * 100).toFixed(0)}%</p>
                  {p.isOutlier && <p className="mt-1 text-xs font-medium text-status-poor">Unusual vs. history (z = {p.zScore?.toFixed(1)})</p>}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What drove this result" description="Share of the lost points (100 − index) caused by each parameter. Higher bars matter most.">
          {a.wqi >= 99.5 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">All parameters scored full marks — nothing lowered the index.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contrib} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Share of lost points"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="share" radius={[0, 6, 6, 0]} barSize={20}>
                    {contrib.map((c) => (
                      <Cell key={c.name} fill={c.status === "normal" ? "var(--status-excellent)" : c.status === "watch" ? "var(--status-fair)" : c.status === "concern" ? "var(--status-poor)" : "var(--status-critical)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Unusual readings & observations" description={a.historySize < OUTLIER_MIN_HISTORY ? `History comparison needs at least ${OUTLIER_MIN_HISTORY} earlier samples (you have ${a.historySize}).` : `Compared with ${a.historySize} earlier samples.`}>
          {a.findings.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-status-excellent/10 p-4 text-sm text-status-excellent"><CheckCircle2 className="size-4" /> No unusual readings were found.</p>
          ) : (
            <ul className="space-y-3">
              {a.findings.map((f, i) => <FindingItem key={i} f={f} />)}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Suggested further testing" description="These five indicators cannot confirm safety. The tests below would tell you more.">
        <ul className="grid gap-3 md:grid-cols-2">
          {report.tests.map((t) => (
            <li key={t.test} className="flex gap-3 rounded-lg border p-3">
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-eco" />
              <div>
                <p className="text-sm font-medium text-foreground">{t.test} <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">{t.priority}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">{t.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        The indicator index comes from the AquaSentinel rule-based model v{a.modelVersion} (a transparent scoring method). The anomaly check above comes from the separate Isolation Forest model on the backend server.
        <Link to="/methodology" className="font-medium text-primary underline">How it works</Link>
      </p>
    </div>
  );
}

function FindingItem({ f }: { f: Finding }) {
  const Icon = FINDING_ICON[f.kind];
  const tone = f.severity === "critical" ? "border-status-critical/40 bg-status-critical/8" : f.severity === "warning" ? "border-status-poor/40 bg-status-poor/8" : "border-border bg-muted/50";
  return (
    <li className={`flex gap-3 rounded-lg border p-3 ${tone}`}>
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-medium text-foreground">{f.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{FINDING_KIND[f.kind]}</p>
      </div>
    </li>
  );
}
