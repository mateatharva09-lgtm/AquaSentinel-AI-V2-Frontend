import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { predictAnomaly } from "@/lib/water/ml.functions";
import type { MlCallResult, MlInput } from "@/lib/water/ml";

/** Calls the real Isolation Forest backend and tracks loading time and errors. */
export function useMlCheck() {
  const predict = useServerFn(predictAnomaly);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const run = async (input: MlInput): Promise<MlCallResult> => {
    setRunning(true);
    setError(null);
    setElapsed(0);
    const start = Date.now();
    timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    let out: MlCallResult;
    try {
      out = await predict({ data: input });
    } catch (e) {
      console.error(e);
      out = { ok: false, kind: "network", message: "The app could not complete the request to the model server. Check your connection and try again." };
    } finally {
      if (timer.current) clearInterval(timer.current);
      setRunning(false);
    }
    if (!out.ok) setError(out.message);
    return out;
  };

  return { run, running, elapsed, error, clearError: () => setError(null) };
}
