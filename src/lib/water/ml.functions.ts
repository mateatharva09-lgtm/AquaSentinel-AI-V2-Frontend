import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_ML_API_URL, mlInputSchema, parseMlResponse, type MlCallResult } from "./ml";

/**
 * Sends conductivity, turbidity and temperature to the Isolation Forest backend (POST /predict)
 * and returns its real answer. Never invents a result: every failure is returned as an error.
 * Override the backend with the AQUASENTINEL_API_URL environment variable.
 */
export const predictAnomaly = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => mlInputSchema.parse(data))
  .handler(async ({ data }): Promise<MlCallResult> => {
    const base = (process.env["AQUASENTINEL_API_URL"]?.trim() || DEFAULT_ML_API_URL).replace(/\/+$/, "");
    const endpoint = `${base}/predict`;
    const started = Date.now();
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ conductivity: data.conductivity, turbidity: data.turbidity, temperature: data.temperature }),
        // Free hosting can take up to about a minute to wake up.
        signal: AbortSignal.timeout(75_000),
      });
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      console.error("ML backend request failed", e);
      return timeout
        ? { ok: false, kind: "timeout", message: "The model server did not answer within 75 seconds. It may be starting up — please try again." }
        : { ok: false, kind: "network", message: "Could not reach the model server. Check your internet connection and try again." };
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) console.error("ML backend error", res.status, body);
    return parseMlResponse(res.status, body, {
      input: data,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      endpoint,
    });
  });
