import { useMemo } from "react";
import { historyFor, useSamples } from "@/lib/water/hooks";
import { assess, toMeasurements } from "@/lib/water/model";

/** Loads one sample by id and runs the full assessment (with uncertainty analysis). */
export function useSampleAssessment(id: string) {
  const samples = useSamples();
  return useMemo(() => {
    if (!samples) return { loading: true as const };
    const sample = samples.find((s) => String(s.id) === id);
    if (!sample) return { loading: false as const, sample: null };
    const assessment = assess(toMeasurements(sample), { history: historyFor(samples, sample), withUncertainty: true });
    return { loading: false as const, sample, assessment };
  }, [samples, id]);
}
