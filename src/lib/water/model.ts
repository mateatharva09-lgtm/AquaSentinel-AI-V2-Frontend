/**
 * AquaSentinel water-quality assessment model (version 1.0).
 *
 * This is a TRANSPARENT RULE-BASED MODEL (separate from the Isolation Forest backend in ml.ts). It combines:
 *  1. Sub-index curves (0–100) per parameter, defined as piecewise-linear breakpoints.
 *  2. A weighted arithmetic Water Quality Index (WQI), in the tradition of Horton (1965)
 *     and the NSF-WQI (Brown et al., 1970).
 *  3. A minimum-operator guard so a single severe reading cannot be hidden ("eclipsed")
 *     by good readings elsewhere.
 *  4. Dissolved-oxygen saturation from temperature (Benson & Krause 1984, as in APHA
 *     Standard Methods 4500-O).
 *  5. A Monte-Carlo measurement-uncertainty analysis that reports how stable the
 *     classification is under typical field-meter error.
 *  6. Statistical outlier detection against the user's own history using the modified
 *     z-score (Iglewicz & Hoaglin, 1993).
 *  7. Cross-parameter pattern rules that point to possible causes worth investigating.
 *
 * It NEVER determines whether water is safe to drink.
 */
import { PARAMETERS, PARAMETER_KEYS, type Measurements, type ParameterKey } from "./parameters";

export const MODEL_VERSION = "1.0.0";

export type Category = "excellent" | "good" | "fair" | "poor" | "very-poor";
export type ParameterStatus = "normal" | "watch" | "concern" | "critical";
export type ConfidenceLevel = "high" | "moderate" | "low";

export const CATEGORY_LABELS: Record<Category, string> = {
  excellent: "Excellent indicators",
  good: "Good indicators",
  fair: "Fair – monitor",
  poor: "Poor – investigate",
  "very-poor": "Very poor – investigate urgently",
};

export const STATUS_LABELS: Record<ParameterStatus, string> = {
  normal: "Within reference",
  watch: "Borderline",
  concern: "Outside reference",
  critical: "Far outside reference",
};

/** Weights sum to 1. Turbidity and DO carry the most weight as the strongest contamination signals. */
export const WEIGHTS: Record<ParameterKey, number> = {
  ph: 0.22,
  turbidity: 0.25,
  dissolvedOxygen: 0.25,
  conductivity: 0.18,
  temperature: 0.1,
};

/**
 * Sub-index breakpoints [x, score]. Dissolved oxygen is scored on % saturation, not mg/L.
 * Values between breakpoints are linearly interpolated; values beyond the ends are clamped.
 */
export const SUB_INDEX_CURVES: Record<ParameterKey, ReadonlyArray<readonly [number, number]>> = {
  ph: [
    [0, 0], [4, 0], [5.5, 25], [6.5, 90], [7, 100], [8, 100], [8.5, 90], [9.5, 25], [11, 0], [14, 0],
  ],
  turbidity: [
    [0, 100], [1, 95], [5, 75], [10, 50], [25, 30], [50, 15], [100, 5], [4000, 0],
  ],
  dissolvedOxygen: [
    [0, 0], [20, 5], [40, 20], [60, 50], [80, 85], [90, 100], [110, 100], [120, 90], [140, 60],
    [160, 40], [200, 20], [300, 5],
  ],
  conductivity: [
    [0, 70], [50, 90], [100, 100], [800, 100], [1500, 75], [2500, 50], [3000, 40], [5000, 15],
    [10000, 5], [100000, 0],
  ],
  temperature: [
    [0, 80], [5, 95], [10, 100], [25, 100], [30, 80], [35, 50], [40, 25], [45, 10], [50, 0],
  ],
};

export function interpolate(curve: ReadonlyArray<readonly [number, number]>, x: number): number {
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i]!;
    const [x0, y0] = curve[i - 1]!;
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

/** Oxygen solubility in fresh water at 1 atm (mg/L), Benson & Krause (1984) / APHA 4500-O. */
export function oxygenSaturation(temperatureC: number): number {
  const T = temperatureC + 273.15;
  const lnC =
    -139.34411 +
    1.575701e5 / T -
    6.642308e7 / T ** 2 +
    1.2438e10 / T ** 3 -
    8.621949e11 / T ** 4;
  return Math.exp(lnC);
}

export function doPercentSaturation(doMgL: number, temperatureC: number): number {
  return (doMgL / oxygenSaturation(temperatureC)) * 100;
}

export function subIndex(key: ParameterKey, m: Measurements): number {
  const x = key === "dissolvedOxygen" ? doPercentSaturation(m.dissolvedOxygen, m.temperature) : m[key];
  return interpolate(SUB_INDEX_CURVES[key], x);
}

export function statusFromSubIndex(q: number): ParameterStatus {
  if (q >= 80) return "normal";
  if (q >= 50) return "watch";
  if (q >= 25) return "concern";
  return "critical";
}

const CATEGORY_ORDER: Category[] = ["very-poor", "poor", "fair", "good", "excellent"];

export function categoryFromIndex(wqi: number): Category {
  if (wqi >= 90) return "excellent";
  if (wqi >= 70) return "good";
  if (wqi >= 50) return "fair";
  if (wqi >= 25) return "poor";
  return "very-poor";
}

function worseOf(a: Category, b: Category): Category {
  return CATEGORY_ORDER.indexOf(a) <= CATEGORY_ORDER.indexOf(b) ? a : b;
}

/** Weighted WQI plus the minimum-operator guard. */
export function computeIndex(m: Measurements): { wqi: number; category: Category; subIndices: Record<ParameterKey, number> } {
  const subIndices = {} as Record<ParameterKey, number>;
  let wqi = 0;
  for (const key of PARAMETER_KEYS) {
    const q = subIndex(key, m);
    subIndices[key] = q;
    wqi += WEIGHTS[key] * q;
  }
  let category = categoryFromIndex(wqi);
  const minQ = Math.min(...Object.values(subIndices));
  if (minQ < 25) category = worseOf(category, "poor");
  else if (minQ < 50) category = worseOf(category, "fair");
  return { wqi, category, subIndices };
}

// ---------- Uncertainty (Monte Carlo) ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(m: Measurements): number {
  const s = PARAMETER_KEYS.map((k) => m[k].toFixed(3)).join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface UncertaintyResult {
  draws: number;
  /** Share of simulated readings that produced the same category (0–1). */
  stability: number;
  low: number; // 5th percentile WQI
  high: number; // 95th percentile WQI
  level: ConfidenceLevel;
}

export function uncertaintyAnalysis(m: Measurements, draws = 1000): UncertaintyResult {
  const rand = mulberry32(seedFrom(m));
  const normal = () => {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const base = computeIndex(m).category;
  const values: number[] = [];
  let same = 0;
  for (let i = 0; i < draws; i++) {
    const sim = {} as Measurements;
    for (const key of PARAMETER_KEYS) {
      const def = PARAMETERS[key];
      const v = m[key] + normal() * def.uncertainty(m[key]);
      sim[key] = Math.min(def.max, Math.max(def.min, v));
    }
    const r = computeIndex(sim);
    values.push(r.wqi);
    if (r.category === base) same++;
  }
  values.sort((a, b) => a - b);
  const stability = same / draws;
  return {
    draws,
    stability,
    low: values[Math.floor(draws * 0.05)] ?? 0,
    high: values[Math.min(draws - 1, Math.floor(draws * 0.95))] ?? 0,
    level: stability >= 0.9 ? "high" : stability >= 0.7 ? "moderate" : "low",
  };
}

// ---------- Statistical outliers ----------

export const OUTLIER_MIN_HISTORY = 8;
export const OUTLIER_THRESHOLD = 3.5;

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length === 0) return 0;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Modified z-score of x relative to a reference set (Iglewicz & Hoaglin 1993). Null when undefined. */
export function modifiedZScore(x: number, reference: number[]): number | null {
  if (reference.length < OUTLIER_MIN_HISTORY) return null;
  const med = median(reference);
  const mad = median(reference.map((v) => Math.abs(v - med)));
  if (mad === 0) return null;
  return (0.6745 * (x - med)) / mad;
}

// ---------- Full assessment ----------

export interface ParameterResult {
  key: ParameterKey;
  value: number;
  subIndex: number;
  status: ParameterStatus;
  weight: number;
  /** Weighted points this parameter contributes to the WQI. */
  points: number;
  /** Share (0–1) of the total score deficit caused by this parameter. */
  deficitShare: number;
  zScore: number | null;
  isOutlier: boolean;
}

export interface Finding {
  kind: "reference" | "statistical" | "pattern";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  parameters: ParameterKey[];
}

export interface Assessment {
  modelVersion: string;
  wqi: number;
  category: Category;
  categoryLabel: string;
  guardApplied: boolean;
  doSaturationPercent: number;
  doSaturationMgL: number;
  parameters: ParameterResult[];
  findings: Finding[];
  requiresInvestigation: boolean;
  uncertainty: UncertaintyResult | null;
  historySize: number;
}

export interface AssessOptions {
  /** Previous measurements (excluding this sample) for statistical outlier detection. */
  history?: Measurements[];
  withUncertainty?: boolean;
}

export function assess(m: Measurements, options: AssessOptions = {}): Assessment {
  const { history = [], withUncertainty = true } = options;
  const { wqi, category, subIndices } = computeIndex(m);
  const rawCategory = categoryFromIndex(wqi);
  const totalDeficit = PARAMETER_KEYS.reduce((s, k) => s + WEIGHTS[k] * (100 - subIndices[k]), 0);

  const parameters: ParameterResult[] = PARAMETER_KEYS.map((key) => {
    const q = subIndices[key];
    const z = modifiedZScore(m[key], history.map((h) => h[key]));
    return {
      key,
      value: m[key],
      subIndex: q,
      status: statusFromSubIndex(q),
      weight: WEIGHTS[key],
      points: WEIGHTS[key] * q,
      deficitShare: totalDeficit > 0 ? (WEIGHTS[key] * (100 - q)) / totalDeficit : 0,
      zScore: z,
      isOutlier: z !== null && Math.abs(z) > OUTLIER_THRESHOLD,
    };
  });

  const doSat = doPercentSaturation(m.dissolvedOxygen, m.temperature);
  const findings = buildFindings(m, parameters, doSat);

  const requiresInvestigation =
    category === "poor" ||
    category === "very-poor" ||
    parameters.some((p) => p.status === "concern" || p.status === "critical" || p.isOutlier);

  return {
    modelVersion: MODEL_VERSION,
    wqi,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    guardApplied: category !== rawCategory,
    doSaturationPercent: doSat,
    doSaturationMgL: oxygenSaturation(m.temperature),
    parameters,
    findings,
    requiresInvestigation,
    uncertainty: withUncertainty ? uncertaintyAnalysis(m) : null,
    historySize: history.length,
  };
}

function buildFindings(m: Measurements, params: ParameterResult[], doSat: number): Finding[] {
  const out: Finding[] = [];
  for (const p of params) {
    const def = PARAMETERS[p.key];
    if (p.status === "concern" || p.status === "critical") {
      out.push({
        kind: "reference",
        severity: p.status === "critical" ? "critical" : "warning",
        title: `${def.label} ${p.status === "critical" ? "far outside" : "outside"} the reference range`,
        detail: `Measured ${p.value} ${def.unit}${p.key === "dissolvedOxygen" ? ` (${doSat.toFixed(0)} % saturation)` : ""}. Reference: ${def.referenceText}.`,
        parameters: [p.key],
      });
    } else if (p.status === "watch") {
      out.push({
        kind: "reference",
        severity: "info",
        title: `${def.label} is borderline`,
        detail: `Measured ${p.value} ${def.unit}${p.key === "dissolvedOxygen" ? ` (${doSat.toFixed(0)} % saturation)` : ""}, close to the edge of the reference range (${def.referenceText}).`,
        parameters: [p.key],
      });
    }
    if (p.isOutlier && p.zScore !== null) {
      out.push({
        kind: "statistical",
        severity: "warning",
        title: `${def.label} is unusual compared with your history`,
        detail: `Modified z-score ${p.zScore.toFixed(1)} (threshold ±${OUTLIER_THRESHOLD}). The reading is ${p.zScore > 0 ? "much higher" : "much lower"} than the typical value in your saved samples. Check calibration and re-measure.`,
        parameters: [p.key],
      });
    }
  }

  if (m.turbidity > 10 && doSat < 70) {
    out.push({
      kind: "pattern",
      severity: "warning",
      title: "Possible organic or sediment loading",
      detail: "High turbidity together with low oxygen often accompanies sewage, runoff or decomposing organic matter.",
      parameters: ["turbidity", "dissolvedOxygen"],
    });
  }
  if (doSat > 120 && m.ph > 8.5) {
    out.push({
      kind: "pattern",
      severity: "info",
      title: "Possible algal or plant photosynthesis",
      detail: "Oxygen supersaturation with raised pH is typical of strong daytime photosynthesis, which can follow nutrient enrichment.",
      parameters: ["dissolvedOxygen", "ph"],
    });
  }
  if (m.temperature > 30 && doSat < 80) {
    out.push({
      kind: "pattern",
      severity: "info",
      title: "Thermal stress on oxygen levels",
      detail: "Warm water holds less oxygen and speeds up microbial oxygen demand.",
      parameters: ["temperature", "dissolvedOxygen"],
    });
  }
  if (m.ph < 6 && m.conductivity > 1500) {
    out.push({
      kind: "pattern",
      severity: "warning",
      title: "Possible acidic, mineral-rich discharge",
      detail: "Low pH with high conductivity can indicate industrial or mine drainage that may carry dissolved metals.",
      parameters: ["ph", "conductivity"],
    });
  }
  if (m.conductivity > 1500 && m.ph > 8.5) {
    out.push({
      kind: "pattern",
      severity: "info",
      title: "Possible saline or alkaline input",
      detail: "High conductivity with alkaline pH can result from saline intrusion, detergents or certain industrial effluents.",
      parameters: ["conductivity", "ph"],
    });
  }
  if (m.conductivity < 30) {
    out.push({
      kind: "pattern",
      severity: "info",
      title: "Very low mineral content",
      detail: "Conductivity this low is uncommon in natural fresh water. It may be rain, distilled or treated water, or indicate a meter calibration issue.",
      parameters: ["conductivity"],
    });
  }
  return out;
}

export function toMeasurements(s: Measurements): Measurements {
  return {
    ph: s.ph,
    turbidity: s.turbidity,
    dissolvedOxygen: s.dissolvedOxygen,
    conductivity: s.conductivity,
    temperature: s.temperature,
  };
}
