import { z } from "zod";
import { PARAMETERS, type ParameterKey } from "./parameters";

function measurementField(key: ParameterKey) {
  const def = PARAMETERS[key];
  return z
    .string()
    .trim()
    .min(1, { message: `Enter the ${key === "ph" ? "pH" : def.label.toLowerCase()} reading` })
    .refine((v) => /^-?\d*(\.\d+)?$/.test(v) && v !== "-" && v !== ".", {
      message: "Enter a number (use a dot for decimals, e.g. 7.25)",
    })
    .refine((v) => Number(v) >= def.min && Number(v) <= def.max, {
      message: `${def.label} must be between ${def.min} and ${def.max.toLocaleString("en-US")} ${def.unit}`,
    });
}

const optionalCoord = (min: number, max: number, name: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), {
      message: `${name} must be a number between ${min} and ${max}`,
    });

export const WATER_SOURCES = ["river", "lake", "canal", "groundwater", "tap", "rainwater", "other"] as const;
export type WaterSource = (typeof WATER_SOURCES)[number];

export const SOURCE_LABELS: Record<WaterSource, string> = {
  river: "River / stream",
  lake: "Lake / pond",
  canal: "Canal / drain",
  groundwater: "Well / groundwater",
  tap: "Tap / piped supply",
  rainwater: "Rainwater",
  other: "Other",
};

export const sampleFormSchema = z
  .object({
    label: z.string().trim().min(1, { message: "Give the sample a name" }).max(80, { message: "Keep the name under 80 characters" }),
    siteName: z.string().trim().min(1, { message: "Enter where the sample was taken" }).max(100, { message: "Keep the location under 100 characters" }),
    waterSource: z.enum(WATER_SOURCES),
    collectedAt: z
      .string()
      .min(1, { message: "Choose the collection date" })
      .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Enter a valid date" })
      .refine((v) => Date.parse(v) <= Date.now() + 86_400_000, { message: "The collection date cannot be in the future" }),
    latitude: optionalCoord(-90, 90, "Latitude"),
    longitude: optionalCoord(-180, 180, "Longitude"),
    ph: measurementField("ph"),
    turbidity: measurementField("turbidity"),
    dissolvedOxygen: measurementField("dissolvedOxygen"),
    conductivity: measurementField("conductivity"),
    temperature: measurementField("temperature"),
    notes: z.string().trim().max(500, { message: "Keep notes under 500 characters" }),
  })
  .refine((v) => (v.latitude === "") === (v.longitude === ""), {
    message: "Enter both latitude and longitude, or leave both empty",
    path: ["longitude"],
  });

export type SampleFormValues = z.input<typeof sampleFormSchema>;
