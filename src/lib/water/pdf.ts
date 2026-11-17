/**
 * PDF export (browser only). Builds the report from data with jsPDF — no screenshots.
 * Import this module dynamically from the browser; never at the top of a route file.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Assessment } from "./model";
import type { WaterReport } from "./report";

// jsPDF's built-in Helvetica only supports Latin-1, so replace symbols it cannot draw.
const clean = (s: string) =>
  s.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/±/g, "+/-").replace(/–|—/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

const NAVY: [number, number, number] = [22, 44, 84];
const BLUE: [number, number, number] = [28, 100, 180];
const GREEN: [number, number, number] = [36, 150, 110];
const GREY: [number, number, number] = [90, 100, 120];
const CATEGORY_RGB: Record<string, [number, number, number]> = {
  excellent: [36, 150, 110],
  good: [30, 140, 170],
  fair: [215, 165, 40],
  poor: [220, 110, 50],
  "very-poor": [200, 50, 50],
};

export function buildReportPdf(report: WaterReport, a: Assessment): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  let y = 0;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(...GREEN);
  doc.rect(0, 30, W, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AquaSentinel AI", M, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Water quality screening report  |  Supporting UN SDG 6: Clean Water and Sanitation", M, 22);
  y = 42;

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const titleLines = doc.splitTextToSize(clean(report.title), W - 2 * M);
  doc.text(titleLines, M, y);
  y += titleLines.length * 6 + 2;

  // Score box
  const rgb = CATEGORY_RGB[a.category] ?? BLUE;
  doc.setFillColor(...rgb);
  doc.roundedRect(M, y, 46, 24, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(a.wqi.toFixed(0), M + 23, y + 13, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Indicator index / 100", M + 23, y + 20, { align: "center" });

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(clean(a.categoryLabel), M + 52, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  const confText = a.uncertainty
    ? `Confidence: ${a.uncertainty.level} - ${(a.uncertainty.stability * 100).toFixed(0)}% of ${a.uncertainty.draws} simulated measurement-error draws keep this classification. 90% range: ${a.uncertainty.low.toFixed(0)}-${a.uncertainty.high.toFixed(0)}.`
    : "";
  const inv = a.requiresInvestigation ? "Further investigation recommended." : "No parameter requires urgent follow-up.";
  doc.text(doc.splitTextToSize(clean(`${inv} ${confText}`), W - 2 * M - 52), M + 52, y + 13);
  y += 32;

  const section = (title: string) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...BLUE);
    doc.text(title, M, y);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.line(M, y + 1.5, W - M, y + 1.5);
    y += 7;
  };
  const paragraph = (text: string, size = 9.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(40, 48, 66);
    const lines = doc.splitTextToSize(clean(text), W - 2 * M);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, M, y);
      y += size * 0.45;
    }
    y += 2;
  };
  const table = (head: string[], body: string[][], widths?: number[]) => {
    autoTable(doc, {
      startY: y,
      head: [head.map(clean)],
      body: body.map((r) => r.map(clean)),
      margin: { left: M, right: M },
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [40, 48, 66] },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 247, 252] },
      ...(widths ? { columnStyles: Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])) } : {}),
    });
    // @ts-expect-error lastAutoTable is added by the plugin at runtime
    y = (doc.lastAutoTable?.finalY ?? y) + 6;
  };

  section("Summary");
  paragraph(report.summary);

  section("Machine-learning anomaly check (Isolation Forest)");
  if (report.ml) {
    table(
      ["Field", "Value"],
      [
        ["Model result", report.ml.status],
        ["Prediction value", String(report.ml.prediction)],
        ["Model", report.ml.model],
        ["Checked", new Date(report.ml.checkedAt).toLocaleString("en-GB")],
        ...(report.ml.serverMessage ? [["Message from model server", report.ml.serverMessage]] : []),
      ],
      [45],
    );
    paragraph(report.ml.explanation);
    paragraph(report.ml.disclaimer);
  } else {
    paragraph("This sample was not checked by the Isolation Forest model, so no machine-learning result is included.");
  }

  section("Sample details");
  table(["Field", "Value"], report.overview.map((o) => [o.label, o.value]), [45]);

  section("Measured parameters");
  table(
    ["Parameter", "Reading", "Status", "Sub-index", "Weight"],
    a.parameters.map((p, i) => [
      report.parameters[i]?.label ?? p.key,
      report.parameters[i]?.reading ?? String(p.value),
      report.parameters[i]?.status ?? p.status,
      p.subIndex.toFixed(0),
      `${(p.weight * 100).toFixed(0)}%`,
    ]),
  );

  section("What the readings mean");
  for (const p of report.parameters) paragraph(`${p.label} (${p.reading}): ${p.explanation}`);

  section("Unusual readings");
  if (report.unusual.length === 0) paragraph("No unusual readings were identified.");
  else for (const u of report.unusual) paragraph(`- ${u}`);

  section("Suggested further testing");
  table(["Priority", "Test", "Why"], report.tests.map((t) => [t.priority, t.test, t.reason]), [24, 60]);

  section("Limitations");
  for (const l of report.limitations) paragraph(`- ${l}`);

  section("Important");
  paragraph(report.disclaimer);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(
      clean(`Generated ${new Date(report.generatedAt).toLocaleString("en-GB")} by AquaSentinel AI (rule-based model v${a.modelVersion}). Not a drinking-water safety certificate.`),
      M,
      290,
    );
    doc.text(`Page ${i} of ${pages}`, W - M, 290, { align: "right" });
  }
  return doc.output("blob");
}

export { downloadBlob } from "./download";
