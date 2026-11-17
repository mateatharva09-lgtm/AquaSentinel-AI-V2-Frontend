import type { Measurements } from "./parameters";
import type { WaterSource } from "./validation";
import type { MlResult } from "./ml";

/** A stored water sample (one row of the `samples` table). */
export interface Sample extends Measurements {
  id?: number;
  label: string;
  siteName: string;
  waterSource: WaterSource;
  latitude: number | null;
  longitude: number | null;
  /** ISO date (YYYY-MM-DD) the sample was collected. */
  collectedAt: string;
  notes: string;
  /** True for synthetic demonstration rows shipped with the app. */
  isDemo: boolean;
  /** ISO timestamp the record was saved. */
  createdAt: string;
  /** Real answer from the Isolation Forest backend, or absent/null if it has not been checked. */
  mlResult?: MlResult | null;
}
