import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { Assessment } from "@/lib/water/model";
import type { WaterReport } from "@/lib/water/report";

type PdfModule = typeof import("@/lib/water/pdf");

/** Loads the PDF library after the page opens, so the click itself downloads instantly. */
export function PdfButton({ report, assessment, filename, ...props }: { report: WaterReport; assessment: Assessment; filename: string } & ButtonProps) {
  const mod = useRef<PdfModule | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    import("@/lib/water/pdf")
      .then((m) => {
        if (!alive) return;
        mod.current = m;
        setReady(true);
      })
      .catch(() => toast.error("The PDF tool could not load. Check your connection and refresh."));
    return () => {
      alive = false;
    };
  }, []);

  const onClick = () => {
    if (!mod.current) return;
    try {
      const blob = mod.current.buildReportPdf(report, assessment);
      mod.current.downloadBlob(blob, filename);
      toast.success("PDF report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("The PDF could not be created");
    }
  };

  return (
    <Button onClick={onClick} disabled={!ready} {...props}>
      {ready ? <Download /> : <Loader2 className="animate-spin" />} Download PDF
    </Button>
  );
}

export function pdfFilename(label: string) {
  return `AquaSentinel-report-${label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 50) || "sample"}.pdf`;
}
