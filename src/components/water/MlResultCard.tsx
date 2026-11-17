import { AlertOctagon, BrainCircuit, CheckCircle2, Loader2, RefreshCw, ServerCrash, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ML_DISCLAIMER, type MlResult } from "@/lib/water/ml";
import { PARAMETERS } from "@/lib/water/parameters";

export function MlStatusBadge({ status, className }: { status: "Normal" | "Anomaly"; className?: string }) {
  const anomaly = status === "Anomaly";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        anomaly ? "bg-status-poor/12 text-status-poor" : "bg-status-excellent/12 text-status-excellent",
        className,
      )}
    >
      {anomaly ? <AlertOctagon className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
      {status}
    </span>
  );
}

export function MlLoading({ elapsed }: { elapsed: number }) {
  return (
    <div className="flex gap-3 rounded-lg border border-primary/30 bg-secondary p-4 text-sm text-secondary-foreground" role="status" aria-live="polite">
      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
      <div>
        <p className="font-semibold">Asking the Isolation Forest model… {elapsed}s</p>
        <p className="mt-0.5 text-xs">
          {elapsed >= 8
            ? "The model server is probably waking up after being idle. This can take up to a minute — please keep this page open."
            : "Sending conductivity, turbidity and temperature to the model server."}
        </p>
      </div>
    </div>
  );
}

export function MlError({ message, onRetry, extra }: { message: string; onRetry?: () => void; extra?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/8 p-4 text-sm" role="alert">
      <p className="flex items-center gap-2 font-semibold text-destructive"><ServerCrash className="size-4" /> Model check failed</p>
      <p className="mt-1 text-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">No machine-learning result is shown because none was received.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry && <Button size="sm" variant="outline" onClick={onRetry} type="button"><RefreshCw /> Try again</Button>}
        {extra}
      </div>
    </div>
  );
}

export function MlDisclaimer() {
  return (
    <p className="flex gap-2 rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
      {ML_DISCLAIMER}
    </p>
  );
}

/** Full panel used on the sample page. */
export function MlResultPanel({
  result, running, elapsed, error, onRun, disabled,
}: { result: MlResult | null | undefined; running: boolean; elapsed: number; error: string | null; onRun: () => void; disabled?: boolean }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-card md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BrainCircuit className="size-5 text-primary" /> Machine-learning anomaly check
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Real prediction from the Isolation Forest model on the AquaSentinel backend server.</p>
        </div>
        <Button variant={result ? "outline" : "default"} size="sm" onClick={onRun} disabled={running || disabled} type="button">
          {running ? <Loader2 className="animate-spin" /> : result ? <RefreshCw /> : <BrainCircuit />}
          {result ? "Check again" : "Run model check"}
        </Button>
      </div>

      <div className="space-y-3">
        {running && <MlLoading elapsed={elapsed} />}
        {error && !running && <MlError message={error} onRetry={onRun} />}

        {result ? (
          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            <div className={cn("flex min-w-44 flex-col items-center justify-center rounded-xl p-5 text-center", result.status === "Anomaly" ? "bg-status-poor/10" : "bg-status-excellent/10")}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Model result</p>
              <p className={cn("mt-1 font-display text-3xl font-bold", result.status === "Anomaly" ? "text-status-poor" : "text-status-excellent")}>{result.status}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">prediction = {result.prediction}</p>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-foreground">
                {result.status === "Anomaly"
                  ? "The model flagged this combination of readings as unusual (an outlier). Treat it as a prompt to re-measure and consider laboratory testing."
                  : "The model found this combination of readings typical of the data it learned from (an inlier)."}
              </p>
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <Row k="Model" v={result.model} />
                <Row k="Checked" v={new Date(result.checkedAt).toLocaleString("en-GB")} />
                {(["conductivity", "turbidity", "temperature"] as const).map((k) => (
                  <Row key={k} k={`Sent: ${PARAMETERS[k].label}`} v={`${result.input[k]} ${PARAMETERS[k].unit}`} />
                ))}
                <Row k="Response time" v={`${(result.latencyMs / 1000).toFixed(1)} s`} />
              </dl>
              {result.warning && (
                <p className="rounded-md border-l-4 border-warning bg-warning-soft px-3 py-2 text-xs text-warning-foreground">
                  <strong>Message from the model server:</strong> {result.warning}
                </p>
              )}
            </div>
          </div>
        ) : (
          !running && !error && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              This sample has not been checked by the machine-learning model yet. Press <strong>Run model check</strong> to send its
              conductivity, turbidity and temperature to the backend.
            </p>
          )
        )}
        <MlDisclaimer />
        <p className="text-xs text-muted-foreground">The model uses only 3 of the 5 readings; pH and dissolved oxygen are assessed by the rule-based index below.</p>
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}
