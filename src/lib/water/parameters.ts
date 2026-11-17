/**
 * Parameter definitions used by the form, the assessment model, the report and the PDF.
 * Reference ranges are drawn from widely used guidance (WHO GDWQ 4th ed. 2022, BIS IS 10500:2012,
 * US EPA secondary standards, and common surface-water ecology thresholds). They are screening
 * indicators, NOT a determination of drinking-water safety.
 */
export type ParameterKey = "ph" | "turbidity" | "dissolvedOxygen" | "conductivity" | "temperature";

export interface Measurements {
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  conductivity: number;
  temperature: number;
}

export interface ParameterDefinition {
  key: ParameterKey;
  label: string;
  shortLabel: string;
  unit: string;
  /** Physically plausible input limits; values outside are rejected as input errors. */
  min: number;
  max: number;
  step: string;
  placeholder: string;
  /** Plain-language description shown next to the form field. */
  description: string;
  /** Plain-language reference range used in the report. */
  referenceText: string;
  /** Typical measurement uncertainty (one standard deviation) of a calibrated field meter. */
  uncertainty: (value: number) => number;
}

export const PARAMETERS: Record<ParameterKey, ParameterDefinition> = {
  ph: {
    key: "ph",
    label: "pH",
    shortLabel: "pH",
    unit: "pH units",
    min: 0,
    max: 14,
    step: "0.01",
    placeholder: "e.g. 7.2",
    description:
      "How acidic or alkaline the water is (0–14, 7 is neutral). Values far from 6.5–8.5 can corrode pipes, release metals or stress aquatic life.",
    referenceText: "6.5 – 8.5 commonly used acceptable range",
    uncertainty: () => 0.1,
  },
  turbidity: {
    key: "turbidity",
    label: "Turbidity",
    shortLabel: "Turbidity",
    unit: "NTU",
    min: 0,
    max: 4000,
    step: "0.1",
    placeholder: "e.g. 3.5",
    description:
      "Cloudiness caused by suspended particles such as silt, algae or microbes. High turbidity can shield pathogens and reduces disinfection effectiveness.",
    referenceText: "Ideally below 1 NTU; below 5 NTU for appearance",
    uncertainty: (v) => 0.1 + 0.02 * v,
  },
  dissolvedOxygen: {
    key: "dissolvedOxygen",
    label: "Dissolved oxygen",
    shortLabel: "DO",
    unit: "mg/L",
    min: 0,
    max: 25,
    step: "0.01",
    placeholder: "e.g. 7.8",
    description:
      "Oxygen available to fish and other organisms. Low values often indicate decomposing organic pollution; very high values can indicate algal growth.",
    referenceText: "About 80–120 % of saturation at the measured temperature",
    uncertainty: () => 0.2,
  },
  conductivity: {
    key: "conductivity",
    label: "Electrical conductivity",
    shortLabel: "EC",
    unit: "µS/cm",
    min: 0,
    max: 100000,
    step: "1",
    placeholder: "e.g. 450",
    description:
      "How well water conducts electricity, which rises with dissolved salts and minerals. Sudden increases can signal sewage, runoff or saline intrusion.",
    referenceText: "Up to about 800 µS/cm typical for fresh water",
    uncertainty: (v) => 1 + 0.01 * v,
  },
  temperature: {
    key: "temperature",
    label: "Water temperature",
    shortLabel: "Temp.",
    unit: "°C",
    min: 0,
    max: 50,
    step: "0.1",
    placeholder: "e.g. 24.5",
    description:
      "Controls how much oxygen water can hold and how fast microbes grow. Used here to calculate oxygen saturation and as a supporting indicator.",
    referenceText: "About 10–25 °C; above 30 °C increases biological stress",
    uncertainty: () => 0.2,
  },
};

export const PARAMETER_KEYS: ParameterKey[] = [
  "ph",
  "turbidity",
  "dissolvedOxygen",
  "conductivity",
  "temperature",
];

export function formatValue(key: ParameterKey, value: number): string {
  if (key === "conductivity") return Math.round(value).toLocaleString("en-US");
  if (key === "ph" || key === "dissolvedOxygen") return value.toFixed(2);
  return value.toFixed(1);
}
