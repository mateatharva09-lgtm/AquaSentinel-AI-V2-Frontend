/**
 * Isolation Forest anomaly check provided by the project's own Python FastAPI backend.
 * This module is browser-safe: shared types, response parsing and plain-language messages.
 * The network call itself lives in `ml.functions.ts` (server side), because the backend does
 * not allow direct browser requests (no CORS headers).
 */
import { z } from "zod";

export const DEFAULT_ML_API_URL = "https://aquasentinel-ai-5ssp.onrender.com";

/** Exactly the three fields the backend's /predict endpoint accepts. */
export const mlInputSchema = z.object({
  conductivity: z.number().finite().min(0).max(100000),
  turbidity: z.number().finite().min(0).max(4000),
  temperature: z.number().finite().min(0).max(50),
});
export type MlInput = z.infer<typeof mlInputSchema>;

/** Shape returned by POST /predict, e.g. {"prediction":-1,"status":"Anomaly","model":"Isolation Forest","warning":"..."} */
export const mlResponseSchema = z.object({
  prediction: z.union([z.literal(1), z.literal(-1)]),
  status: z.enum(["Normal", "Anomaly"]),
  model: z.string().min(1),
  warning: z.string().optional(),
});
export type MlResponse = z.infer<typeof mlResponseSchema>;

/** Stored with a sample: the backend's answer plus when and with what inputs it was obtained. */
export interface MlResult {
  prediction: 1 | -1;
  status: "Normal" | "Anomaly";
  model: string;
  warning: string | null;
  input: MlInput;
  checkedAt: string;
  latencyMs: number;
  endpoint: string;
}

export type MlErrorKind = "timeout" | "network" | "http" | "validation" | "invalid-response";

export type MlCallResult = { ok: true; result: MlResult } | { ok: false; kind: MlErrorKind; message: string; status?: number };

export const ML_DISCLAIMER =
  "An “Anomaly” only means this combination of conductivity, turbidity and temperature is unusual compared with the data the Isolation Forest model learned from. It is not proof of contamination. A “Normal” result does not certify that the water is safe to drink.";

/** Turns a raw backend response into a typed result, or explains what was wrong with it. */
export function parseMlResponse(
  httpStatus: number,
  body: unknown,
  meta: { input: MlInput; checkedAt: string; latencyMs: number; endpoint: string },
): MlCallResult {
  if (httpStatus === 422) {
    const detail = (body as { detail?: { loc?: unknown[]; msg?: string }[] } | null)?.detail;
    const first = Array.isArray(detail) ? detail[0] : undefined;
    const field = first?.loc?.[first.loc.length - 1];
    return {
      ok: false,
      kind: "validation",
      status: 422,
      message: `The model server rejected the readings${field ? ` (${String(field)}: ${first?.msg ?? "invalid"})` : ""}.`,
    };
  }
  if (httpStatus < 200 || httpStatus >= 300) {
    return {
      ok: false,
      kind: "http",
      status: httpStatus,
      message:
        httpStatus >= 500
          ? `The model server had an internal problem (error ${httpStatus}). Please try again in a minute.`
          : `The model server answered with an unexpected error (${httpStatus}).`,
    };
  }
  const parsed = mlResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, kind: "invalid-response", message: "The model server replied, but not in the expected format, so no result is shown." };
  }
  const d = parsed.data;
  // Isolation Forest convention: 1 = inlier (Normal), -1 = outlier (Anomaly). Reject contradictions.
  if ((d.prediction === 1) !== (d.status === "Normal")) {
    return { ok: false, kind: "invalid-response", message: "The model server returned a contradictory result, so no result is shown." };
  }
  return {
    ok: true,
    result: { prediction: d.prediction, status: d.status, model: d.model, warning: d.warning ?? null, ...meta },
  };
}
