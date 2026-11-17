import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/water/PageHeader";
import { SafetyNotice } from "@/components/water/SafetyNotice";
import { CATEGORY_LABELS, MODEL_VERSION, OUTLIER_MIN_HISTORY, OUTLIER_THRESHOLD, SUB_INDEX_CURVES, WEIGHTS, type Category } from "@/lib/water/model";
import { PARAMETERS, PARAMETER_KEYS } from "@/lib/water/parameters";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology – AquaSentinel AI" },
      { name: "description", content: "How AquaSentinel AI scores water samples: sub-index curves, weighted index, uncertainty simulation and outlier detection." },
      { property: "og:title", content: "Methodology – AquaSentinel AI" },
      { property: "og:description", content: "A transparent, documented rule-based water-quality model." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MethodologyPage,
});

const STEPS = [
  ["Sub-indices", "Each reading is converted into a 0–100 score using the breakpoint curves below (straight lines between points). Dissolved oxygen is scored on % saturation, calculated from temperature."],
  ["Weighted index", "The five scores are combined with fixed weights into one indicator index (weighted arithmetic mean)."],
  ["Severity guard", "If any parameter scores below 25 the classification cannot be better than “Poor”; below 50, no better than “Fair”. This prevents one severe problem being averaged away."],
  ["Confidence", "1,000 simulated re-measurements are drawn using typical field-meter error. The share that keeps the same classification is the confidence indicator."],
  ["Outliers", `Each reading is compared with your earlier samples (same site when it has at least ${OUTLIER_MIN_HISTORY}) using the modified z-score; |z| > ${OUTLIER_THRESHOLD} is flagged as unusual.`],
  ["Patterns & report", "Simple documented rules link combinations of readings (e.g. high turbidity + low oxygen) to possible causes, and the report suggests follow-up tests."],
] as const;

const CATS: [Category, string][] = [["excellent", "90–100"], ["good", "70–89"], ["fair", "50–69"], ["poor", "25–49"], ["very-poor", "0–24"]];

function MethodologyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Model v${MODEL_VERSION}`}
        title="How the assessment works"
        description="AquaSentinel AI combines two separate methods: a real Isolation Forest machine-learning model on the project's backend server, and a transparent rule-based indicator index with statistical checks. Every rule and number of the index is listed on this page and in src/lib/water/model.ts."
      />

      <Panel title="Machine-learning anomaly check (Isolation Forest)" description="Runs on the AquaSentinel Python FastAPI backend.">
        <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <p className="font-semibold text-foreground">Input</p>
            <p className="mt-1">Conductivity (µS/cm), turbidity (NTU) and temperature (°C) are sent to <span className="font-mono text-xs">POST /predict</span>. pH and dissolved oxygen are not used by this model.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Output</p>
            <p className="mt-1">The model returns <span className="font-mono text-xs">prediction = 1</span> (“Normal”, an inlier) or <span className="font-mono text-xs">-1</span> (“Anomaly”, an outlier compared with its training data). The app shows this answer exactly as received and stores it with the sample.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Meaning</p>
            <p className="mt-1">An Isolation Forest isolates unusual points with random splits; points isolated quickly are anomalies. An anomaly is not proof of contamination, and “Normal” does not certify drinking-water safety. If the server cannot be reached, no result is shown — nothing is simulated.</p>
          </div>
        </div>
      </Panel>

      <h2 className="pt-2 text-lg font-semibold text-foreground">Rule-based indicator index</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="rounded-xl border bg-card p-5 shadow-card">
            <span className="font-display text-sm font-bold text-eco">Step {i + 1}</span>
            <p className="mt-1 font-semibold text-foreground">{t}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Weights and measurement uncertainty">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Parameter</th><th className="py-2 text-right">Weight</th><th className="py-2 text-right">Assumed meter error (1σ)</th></tr></thead>
            <tbody>
              {PARAMETER_KEYS.map((k) => (
                <tr key={k} className="border-b last:border-0">
                  <td className="py-2">{PARAMETERS[k].label}</td>
                  <td className="py-2 text-right font-mono">{(WEIGHTS[k] * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right font-mono text-xs">{UNCERTAINTY_TEXT[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Classification bands">
          <ul className="space-y-2 text-sm">
            {CATS.map(([c, r]) => (
              <li key={c} className="flex justify-between border-b pb-2 last:border-0"><span>{CATEGORY_LABELS[c]}</span><span className="font-mono text-muted-foreground">{r}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">“Requires investigation” is set when the class is Poor or worse, any parameter is outside its reference range, or any reading is a statistical outlier.</p>
        </Panel>
      </div>

      <Panel title="Sub-index breakpoints" description="Pairs of (reading → score). Scores between points are interpolated linearly.">
        <div className="space-y-3">
          {PARAMETER_KEYS.map((k) => (
            <div key={k} className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-semibold text-foreground">{PARAMETERS[k].label} <span className="font-normal text-muted-foreground">({k === "dissolvedOxygen" ? "% saturation" : PARAMETERS[k].unit})</span></p>
              <p className="mt-1 break-words font-mono text-xs leading-relaxed text-muted-foreground">
                {SUB_INDEX_CURVES[k].map(([x, y]) => `${x}→${y}`).join("  ·  ")}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Limitations">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Five physical/chemical indicators cannot detect pathogens, metals, nitrate, arsenic, fluoride or pesticides.</li>
            <li>Breakpoints and weights are expert-chosen from published guidance; they have not been calibrated against laboratory outcomes.</li>
            <li>Reference ranges suit general fresh water; specific uses (aquaculture, irrigation) have different needs.</li>
            <li>Oxygen saturation assumes fresh water at sea-level pressure. Groundwater is naturally low in oxygen, so low DO in well water is not necessarily pollution.</li>
            <li>Confidence reflects measurement-error sensitivity only, not whether the model itself is correct.</li>
          </ul>
        </Panel>
        <Panel title="References">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>WHO (2022). Guidelines for Drinking-water Quality, 4th ed. incorporating the 1st and 2nd addenda.</li>
            <li>Bureau of Indian Standards (2012). IS 10500: Drinking Water – Specification.</li>
            <li>Horton, R.K. (1965). An index number system for rating water quality. J. WPCF 37(3).</li>
            <li>Brown, R.M. et al. (1970). A water quality index – do we dare? Water & Sewage Works 117.</li>
            <li>Benson, B.B. & Krause, D. (1984). Limnology & Oceanography 29(3) — oxygen solubility; as used in APHA Standard Methods 4500-O.</li>
            <li>Iglewicz, B. & Hoaglin, D. (1993). How to Detect and Handle Outliers. ASQC.</li>
          </ul>
        </Panel>
      </div>

      <SafetyNotice />
    </div>
  );
}

const UNCERTAINTY_TEXT: Record<string, string> = {
  ph: "±0.1 pH",
  turbidity: "±(0.1 + 2% of reading) NTU",
  dissolvedOxygen: "±0.2 mg/L",
  conductivity: "±(1 + 1% of reading) µS/cm",
  temperature: "±0.2 °C",
};
