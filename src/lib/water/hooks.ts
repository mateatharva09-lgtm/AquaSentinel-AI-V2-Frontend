import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { getDb } from "../db";
import { assess, OUTLIER_MIN_HISTORY, toMeasurements, type Assessment } from "./model";
import type { Sample } from "./types";

/** All samples, oldest first. `undefined` while loading (and during server rendering). */
export function useSamples(): Sample[] | undefined {
  return useLiveQuery(async () => {
    if (typeof indexedDB === "undefined") return undefined;
    const rows = await getDb().samples.toArray();
    return rows.sort((a, b) => a.collectedAt.localeCompare(b.collectedAt) || a.createdAt.localeCompare(b.createdAt));
  }, []);
}

export interface AssessedSample {
  sample: Sample;
  assessment: Assessment;
}

/** Fast assessment of every sample (no uncertainty simulation) using prior history for outliers. */
export function useAssessedSamples(): AssessedSample[] | undefined {
  const samples = useSamples();
  return useMemo(() => {
    if (!samples) return undefined;
    return samples.map((s) => ({
      sample: s,
      assessment: assess(toMeasurements(s), {
        history: historyFor(samples, s),
        withUncertainty: false,
      }),
    }));
  }, [samples]);
}

/**
 * Reference history for outlier checks: samples saved before this one, from the same site when
 * that site has enough history, otherwise from all saved samples.
 */
export function historyFor(samples: Sample[], target: Sample) {
  const prior = samples.filter((s) => s.id !== target.id && s.createdAt <= target.createdAt);
  const sameSite = prior.filter((s) => s.siteName === target.siteName);
  return (sameSite.length >= OUTLIER_MIN_HISTORY ? sameSite : prior).map(toMeasurements);
}
