/**
 * Report generator. Produces a plain-language report from a sample and its assessment using
 * transparent, rule-based templates (no generative AI service is called). If the sample was checked
 * by the Isolation Forest backend, its stored real answer is included verbatim.
 */
import { ML_DISCLAIMER } from "./ml";
import { CATEGORY_LABELS, STATUS_LABELS, type Assessment, type ParameterResult } from "./model";
import { PARAMETERS, formatValue, type ParameterKey } from "./parameters";
import type { Sample } from "./types";
import { SOURCE_LABELS } from "./validation";

export interface RecommendedTest {
  test: string;
  reason: string;
  priority: "essential" | "recommended" | "optional";
}

export interface ParameterNarrative {
  key: ParameterKey;
  label: string;
  reading: string;
  status: string;
  explanation: string;
}

export interface WaterReport {
  title: string;
  generatedAt: string;
  summary: string;
  overview: { label: string; value: string }[];
  parameters: ParameterNarrative[];
  unusual: string[];
  tests: RecommendedTest[];
  limitations: string[];
  disclaimer: string;
  /** Real Isolation Forest result, or null when the sample was never checked by the backend. */
  ml: { status: "Normal" | "Anomaly"; prediction: number; model: string; checkedAt: string; serverMessage: string | null; explanation: string; disclaimer: string } | null;
}

export const SAFETY_DISCLAIMER =
  "This assessment is a screening tool based on five physical and chemical indicators. It cannot detect bacteria, viruses, parasites, heavy metals, pesticides, nitrate, fluoride, arsenic or other harmful substances, and it does NOT determine whether water is safe to drink. Only accredited laboratory testing, interpreted against national drinking-water standards, can do that.";

function explain(p: ParameterResult, a: Assessment, sample: Sample): string {
  const v = p.value;
  switch (p.key) {
    case "ph":
      if (v < 6.5)
        return `The water is ${v < 5.5 ? "strongly" : "mildly"} acidic. Acidic water can corrode pipes and fittings and dissolve metals such as lead, copper or iron, and may indicate acid rain, industrial or mine drainage, or decaying organic matter.`;
      if (v > 8.5)
        return `The water is ${v > 9.5 ? "strongly" : "mildly"} alkaline. This can cause scaling, a bitter taste and reduced disinfection effectiveness, and may reflect algal photosynthesis, detergents, or mineral-rich or industrial inputs.`;
      return "pH is within the commonly used 6.5–8.5 range, which suits most aquatic life and water treatment processes.";
    case "turbidity":
      if (v <= 1) return "The water is very clear. Low turbidity supports effective disinfection.";
      if (v <= 5) return "Slight cloudiness. Acceptable for appearance, but above the ≤1 NTU level recommended for effective disinfection.";
      if (v <= 25)
        return "Noticeably cloudy. Suspended particles can shelter microorganisms and indicate runoff, erosion, algae or wastewater.";
      return "Very turbid. Heavy suspended matter suggests significant runoff, sediment disturbance or wastewater input, and strongly reduces disinfection effectiveness.";
    case "dissolvedOxygen": {
      const sat = a.doSaturationPercent.toFixed(0);
      const max = a.doSaturationMgL.toFixed(1);
      if (sample.waterSource === "groundwater" && a.doSaturationPercent < 80)
        return `Oxygen is ${sat} % of saturation. Groundwater is naturally low in oxygen because it is cut off from the air, so this is not necessarily a sign of pollution in well water.`;
      if (a.doSaturationPercent < 60)
        return `Oxygen is low (${sat} % of the ${max} mg/L the water could hold at this temperature). Low oxygen stresses fish and commonly results from decomposing organic pollution such as sewage.`;
      if (a.doSaturationPercent < 80)
        return `Oxygen is somewhat reduced (${sat} % saturation). Sensitive aquatic species may be stressed; organic loading is a possible cause.`;
      if (a.doSaturationPercent > 140)
        return `Oxygen is strongly supersaturated (${sat} %). This usually reflects intense algal or plant photosynthesis, often linked to nutrient pollution.`;
      if (a.doSaturationPercent > 120)
        return `Oxygen is above saturation (${sat} %), which can indicate active algal growth during daylight.`;
      return `Oxygen is healthy at ${sat} % of saturation (saturation at this temperature is ${max} mg/L).`;
    }
    case "conductivity":
      if (v < 30)
        return "Mineral content is unusually low for natural water. This may be rain or treated water, or the meter may need calibration.";
      if (v <= 800) return "Dissolved mineral content is in the typical range for fresh water.";
      if (v <= 1500)
        return "Dissolved salts are moderately elevated. This can be natural geology, but may also reflect sewage, fertiliser runoff or road salts.";
      if (v <= 3000)
        return "Dissolved salts are high. Likely causes include wastewater, industrial discharge, irrigation return flows or saline intrusion.";
      return "Dissolved salts are very high, approaching brackish levels. This may affect taste, crops and aquatic life.";
    case "temperature":
      if (v > 30)
        return "Warm water holds less oxygen and accelerates microbial growth. Check for thermal discharges or shallow, stagnant conditions.";
      if (v < 5) return "Cold water. Biological activity is slow; oxygen capacity is high.";
      return "Temperature is within a typical range. It is mainly used to calculate oxygen saturation.";
  }
}

export function recommendTests(a: Assessment, sample: Sample): RecommendedTest[] {
  const get = (k: ParameterKey) => a.parameters.find((p) => p.key === k)!;
  const tests: RecommendedTest[] = [
    {
      test: "Microbiological testing (E. coli or thermotolerant coliforms)",
      reason: "None of the five measured parameters can detect disease-causing organisms. This is the key test for faecal contamination.",
      priority: "essential",
    },
  ];
  const ph = get("ph");
  const turb = get("turbidity");
  const dox = get("dissolvedOxygen");
  const ec = get("conductivity");
  const temp = get("temperature");

  if (turb.status !== "normal")
    tests.push({
      test: "Total suspended solids (TSS) and repeat turbidity",
      reason: "Confirms particle load and whether it is persistent or event-related (e.g. after rain).",
      priority: "recommended",
    });
  if (dox.status !== "normal" && a.doSaturationPercent < 100)
    tests.push({
      test: "Biochemical and chemical oxygen demand (BOD, COD)",
      reason: "Measures the organic pollution that consumes oxygen.",
      priority: "recommended",
    });
  if (dox.status !== "normal" || turb.status === "concern" || turb.status === "critical")
    tests.push({
      test: "Nutrients: ammonia, nitrate and phosphate",
      reason: "Nutrient enrichment drives algal growth and oxygen swings, and ammonia often accompanies sewage.",
      priority: "recommended",
    });
  if (a.doSaturationPercent > 120)
    tests.push({
      test: "Chlorophyll-a and cyanobacteria screening",
      reason: "Supersaturated oxygen suggests an algal bloom; some cyanobacteria produce toxins.",
      priority: "recommended",
    });
  if (ph.status !== "normal")
    tests.push({
      test: "Alkalinity and dissolved metals (lead, copper, iron, manganese)",
      reason: "pH outside 6.5–8.5 changes metal solubility and pipe corrosion.",
      priority: ph.status === "watch" ? "optional" : "recommended",
    });
  if (ec.status !== "normal")
    tests.push({
      test: "Total dissolved solids, chloride, sulfate, sodium and hardness",
      reason: "Identifies which dissolved salts are causing the unusual conductivity.",
      priority: "recommended",
    });
  if (temp.status !== "normal")
    tests.push({
      test: "Repeat oxygen and temperature profile at different times of day",
      reason: "Warm water causes daily oxygen swings that a single reading can miss.",
      priority: "optional",
    });
  if (sample.waterSource === "groundwater")
    tests.push({
      test: "Arsenic, fluoride and nitrate",
      reason: "Common naturally occurring or agricultural contaminants of well water in many regions.",
      priority: "recommended",
    });
  if (sample.mlResult?.status === "Anomaly")
    tests.push({
      test: "Repeat measurement and laboratory confirmation",
      reason: "The Isolation Forest model flagged this combination of conductivity, turbidity and temperature as unusual. Re-measure to rule out error, then confirm with a laboratory.",
      priority: "recommended",
    });
  if (a.parameters.some((p) => p.isOutlier))
    tests.push({
      test: "Meter calibration check and repeat sampling",
      reason: "At least one value differs strongly from your history; rule out instrument or recording error.",
      priority: "recommended",
    });
  return tests;
}

export function buildReport(sample: Sample, a: Assessment): WaterReport {
  const flagged = a.parameters.filter((p) => p.status !== "normal");
  const conf = a.uncertainty
    ? ` Classification stability under typical measurement error is ${(a.uncertainty.stability * 100).toFixed(0)} % (${a.uncertainty.level} confidence).`
    : "";
  const summary =
    `Sample "${sample.label}" from ${sample.siteName} scored ${a.wqi.toFixed(0)} out of 100 on the AquaSentinel indicator index, classified as "${CATEGORY_LABELS[a.category]}". ` +
    (flagged.length === 0
      ? "All five measured indicators are within their reference ranges."
      : `${flagged.length} of 5 indicators are outside or near the edge of their reference ranges: ${flagged.map((p) => PARAMETERS[p.key].label.toLowerCase()).join(", ")}.`) +
    (a.requiresInvestigation ? " Further investigation is recommended." : "") +
    (sample.mlResult ? ` The Isolation Forest model returned "${sample.mlResult.status}".` : "") +
    conf;

  return {
    title: `Water quality screening report – ${sample.label}`,
    generatedAt: new Date().toISOString(),
    summary,
    overview: [
      { label: "Sample", value: sample.label },
      { label: "Location", value: sample.siteName },
      { label: "Water source", value: SOURCE_LABELS[sample.waterSource] },
      { label: "Collected", value: new Date(sample.collectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
      {
        label: "Coordinates",
        value: sample.latitude !== null && sample.longitude !== null ? `${sample.latitude.toFixed(4)}, ${sample.longitude.toFixed(4)}` : "Not recorded",
      },
      { label: "Data type", value: sample.isDemo ? "Demonstration data (synthetic)" : "User-entered measurement" },
      { label: "Indicator index", value: `${a.wqi.toFixed(1)} / 100` },
      { label: "Classification", value: CATEGORY_LABELS[a.category] },
      { label: "Model", value: `AquaSentinel rule-based WQI v${a.modelVersion}` },
    ],
    parameters: a.parameters.map((p) => ({
      key: p.key,
      label: PARAMETERS[p.key].label,
      reading: `${formatValue(p.key, p.value)} ${PARAMETERS[p.key].unit}`,
      status: STATUS_LABELS[p.status],
      explanation: explain(p, a, sample),
    })),
    unusual: a.findings.filter((f) => f.severity !== "info" || f.kind === "pattern").map((f) => `${f.title}. ${f.detail}`),
    tests: recommendTests(a, sample),
    limitations: [
      "Only five indicators were measured; most health-relevant contaminants are invisible to them.",
      "A single sample reflects one moment. Conditions change with weather, season and time of day.",
      "The indicator index is a transparent, rule-based score and has not been validated against laboratory outcomes for this location.",
      sample.mlResult
        ? "The Isolation Forest anomaly check uses only conductivity, turbidity and temperature, and only knows what is typical of the data it was trained on."
        : "This sample was not checked by the Isolation Forest machine-learning model.",
      a.historySize < 8
        ? "Too few previous samples were available for statistical outlier detection."
        : `Outlier detection compared this sample with ${a.historySize} previous samples.`,
      ...(sample.isDemo ? ["This sample is synthetic demonstration data and does not describe any real water body."] : []),
    ],
    disclaimer: SAFETY_DISCLAIMER,
    ml: sample.mlResult
      ? {
          status: sample.mlResult.status,
          prediction: sample.mlResult.prediction,
          model: sample.mlResult.model,
          checkedAt: sample.mlResult.checkedAt,
          serverMessage: sample.mlResult.warning,
          explanation:
            sample.mlResult.status === "Anomaly"
              ? "The model classified this combination of readings as an outlier (prediction = -1) compared with its training data."
              : "The model classified this combination of readings as an inlier (prediction = 1), typical of its training data.",
          disclaimer: ML_DISCLAIMER,
        }
      : null,
  };
}
