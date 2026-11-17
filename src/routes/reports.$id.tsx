import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FlaskConical, Printer } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CategoryBadge, DemoBadge } from "@/components/water/Badges";
import { LoadingBlock } from "@/components/water/PageHeader";
import { NotFoundSample } from "@/components/water/NotFoundSample";
import { PdfButton, pdfFilename } from "@/components/water/PdfButton";
import { SafetyNotice } from "@/components/water/SafetyNotice";
import { CONFIDENCE_LABELS } from "@/components/water/status";
import { useSampleAssessment } from "@/components/water/useSampleAssessment";
import { buildReport } from "@/lib/water/report";
import { MlStatusBadge } from "@/components/water/MlResultCard";

export const Route = createFileRoute("/reports/$id")({
  head: () => ({
    meta: [
      { title: "Water Quality Report – AquaSentinel AI" },
      { name: "description", content: "Plain-language water-quality screening report with explanations, unusual readings and suggested tests." },
      { property: "og:title", content: "Water Quality Report – AquaSentinel AI" },
      { property: "og:description", content: "Plain-language water-quality screening report." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const result = useSampleAssessment(id);
  const report = useMemo(() => (result.loading || !result.sample ? null : buildReport(result.sample, result.assessment)), [result]);
  if (result.loading) return <LoadingBlock label="Preparing report…" />;
  if (!result.sample || !report) return <NotFoundSample />;
  const { sample, assessment: a } = result;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost"><Link to="/reports"><ArrowLeft /> All reports</Link></Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/samples/$id" params={{ id }}>Open assessment</Link></Button>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
          <PdfButton report={report} assessment={a} filename={pdfFilename(sample.label)} />
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <header className="bg-ocean px-6 py-7 text-primary-foreground md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">AquaSentinel AI · Screening report · SDG 6</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{report.title}</h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Generated {new Date(report.generatedAt).toLocaleString("en-GB")}</p>
        </header>

        <div className="space-y-8 px-6 py-8 md:px-10">
          <section className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-2xl bg-secondary">
              <span className="font-display text-4xl font-bold tabular text-foreground">{a.wqi.toFixed(0)}</span>
              <span className="text-xs text-muted-foreground">index / 100</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2"><CategoryBadge category={a.category} />{sample.isDemo && <DemoBadge />}</div>
              <p className="leading-relaxed text-foreground">{report.summary}</p>
              {a.uncertainty && <p className="text-sm text-muted-foreground">{CONFIDENCE_LABELS[a.uncertainty.level]} · likely range {a.uncertainty.low.toFixed(0)}–{a.uncertainty.high.toFixed(0)}</p>}
            </div>
          </section>

          <ReportSection title="Machine-learning anomaly check (Isolation Forest)">
            {report.ml ? (
              <div className="space-y-2 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <MlStatusBadge status={report.ml.status} />
                  <span className="font-mono text-xs text-muted-foreground">prediction = {report.ml.prediction} · {report.ml.model} · checked {new Date(report.ml.checkedAt).toLocaleString("en-GB")}</span>
                </p>
                <p className="text-foreground">{report.ml.explanation}</p>
                {report.ml.serverMessage && <p className="text-muted-foreground">Message from the model server: “{report.ml.serverMessage}”</p>}
                <p className="text-muted-foreground">{report.ml.disclaimer}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not checked by the machine-learning model. <Link to="/samples/$id" params={{ id }} className="font-medium text-primary underline">Run the model check</Link> on the assessment page.
              </p>
            )}
          </ReportSection>

          <ReportSection title="Sample details">
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {report.overview.map((o) => (
                <div key={o.label} className="flex justify-between gap-4 border-b border-dashed py-1.5 text-sm">
                  <dt className="text-muted-foreground">{o.label}</dt>
                  <dd className="text-right font-medium text-foreground">{o.value}</dd>
                </div>
              ))}
            </dl>
          </ReportSection>

          <ReportSection title="What the readings mean">
            <div className="space-y-4">
              {report.parameters.map((p) => (
                <div key={p.key} className="rounded-lg border-l-4 border-primary/50 bg-muted/40 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{p.label}: <span className="font-mono">{p.reading}</span> <span className="ml-1 font-normal text-muted-foreground">— {p.status}</span></p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.explanation}</p>
                </div>
              ))}
            </div>
          </ReportSection>

          <ReportSection title="Unusual readings">
            {report.unusual.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unusual readings were identified.</p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
                {report.unusual.map((u) => <li key={u}>{u}</li>)}
              </ul>
            )}
          </ReportSection>

          <ReportSection title="Suggested further testing">
            <ul className="space-y-2">
              {report.tests.map((t) => (
                <li key={t.test} className="flex gap-3 text-sm">
                  <FlaskConical className="mt-0.5 size-4 shrink-0 text-eco" />
                  <span><strong className="font-semibold text-foreground">{t.test}</strong> <span className="text-xs uppercase text-muted-foreground">({t.priority})</span> — <span className="text-muted-foreground">{t.reason}</span></span>
                </li>
              ))}
            </ul>
          </ReportSection>

          <ReportSection title="Limitations">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {report.limitations.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </ReportSection>

          <SafetyNotice />
        </div>
      </article>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 border-b pb-2 text-lg font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}
