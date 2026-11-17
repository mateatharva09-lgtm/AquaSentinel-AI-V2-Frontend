import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryBadge, DemoBadge } from "@/components/water/Badges";
import { LoadingBlock, PageHeader, Panel } from "@/components/water/PageHeader";
import { useAssessedSamples } from "@/lib/water/hooks";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Report Generator – AquaSentinel AI" },
      { name: "description", content: "Generate an understandable, downloadable PDF report for any analysed water sample." },
      { property: "og:title", content: "Report Generator – AquaSentinel AI" },
      { property: "og:description", content: "Plain-language water-quality reports with suggested further testing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const data = useAssessedSamples();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!data) return undefined;
    const term = q.trim().toLowerCase();
    return [...data]
      .sort((a, b) => b.sample.collectedAt.localeCompare(a.sample.collectedAt))
      .filter(({ sample }) => !term || `${sample.label} ${sample.siteName}`.toLowerCase().includes(term));
  }, [data, q]);

  return (
    <div>
      <PageHeader
        eyebrow="AI report generator"
        title="Sample reports"
        description="Every analysed sample gets an automatically written report that explains the readings, highlights unusual measurements and suggests further tests. Open one to read it or download it as a PDF."
      />
      <Panel
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search samples or sites" className="pl-9" aria-label="Search samples" />
          </div>
        }
        title={rows ? `${rows.length} sample${rows.length === 1 ? "" : "s"}` : "Samples"}
      >
        {!rows ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No samples match. <Link to="/analysis" className="text-primary underline">Analyse a new sample</Link>.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ sample, assessment }) => (
              <li key={sample.id} className="flex flex-col justify-between rounded-lg border bg-surface p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{sample.label}</p>
                    <span className="font-display text-lg font-bold tabular text-foreground">{assessment.wqi.toFixed(0)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sample.siteName} · {new Date(sample.collectedAt).toLocaleDateString("en-GB")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CategoryBadge category={assessment.category} />
                    {sample.isDemo && <DemoBadge />}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-4 self-start">
                  <Link to="/reports/$id" params={{ id: String(sample.id) }}><FileText /> Open report</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
