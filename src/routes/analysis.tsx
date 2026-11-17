import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BrainCircuit, Crosshair, Info, Loader2, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategoryBadge, StatusBadge } from "@/components/water/Badges";
import { PageHeader, Panel } from "@/components/water/PageHeader";
import { SafetyNotice } from "@/components/water/SafetyNotice";
import { WqiGauge } from "@/components/water/WqiGauge";
import { MlDisclaimer, MlError, MlLoading } from "@/components/water/MlResultCard";
import { useMlCheck } from "@/components/water/useMlCheck";
import type { MlResult } from "@/lib/water/ml";
import { addSample } from "@/lib/db";
import { assess } from "@/lib/water/model";
import { PARAMETERS, PARAMETER_KEYS, type Measurements } from "@/lib/water/parameters";
import { SOURCE_LABELS, WATER_SOURCES, sampleFormSchema, type SampleFormValues } from "@/lib/water/validation";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Water Analysis – AquaSentinel AI" },
      { name: "description", content: "Enter pH, turbidity, dissolved oxygen, conductivity and temperature to get an explained water-quality assessment." },
      { property: "og:title", content: "Water Analysis – AquaSentinel AI" },
      { property: "og:description", content: "Enter five field measurements and get an explained water-quality assessment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisPage,
});

const EMPTY: SampleFormValues = {
  label: "",
  siteName: "",
  waterSource: "river",
  collectedAt: "",
  latitude: "",
  longitude: "",
  ph: "",
  turbidity: "",
  dissolvedOxygen: "",
  conductivity: "",
  temperature: "",
  notes: "",
};

function AnalysisPage() {
  const navigate = useNavigate();
  const [locating, setLocating] = useState(false);
  const ml = useMlCheck();
  const [pending, setPending] = useState<SampleFormValues | null>(null);
  const form = useForm<SampleFormValues>({
    resolver: zodResolver(sampleFormSchema),
    defaultValues: EMPTY,
    mode: "onTouched",
  });
  const { register, handleSubmit, formState, setValue, watch, reset } = form;
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    setValue("collectedAt", new Date().toISOString().slice(0, 10));
  }, [setValue]);

  const values = watch();
  const preview = useMemo(() => {
    const m = {} as Measurements;
    for (const k of PARAMETER_KEYS) {
      const def = PARAMETERS[k];
      const raw = values[k];
      const n = Number(raw);
      if (raw === "" || Number.isNaN(n) || n < def.min || n > def.max) return null;
      m[k] = n;
    }
    return assess(m, { withUncertainty: false });
  }, [values.ph, values.turbidity, values.dissolvedOxygen, values.conductivity, values.temperature]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillExample = () => {
    reset({
      ...EMPTY,
      label: "Example – Riverside sample",
      siteName: "Example riverbank site",
      waterSource: "river",
      collectedAt: new Date().toISOString().slice(0, 10),
      ph: "8.7",
      turbidity: "14.5",
      dissolvedOxygen: "5.1",
      conductivity: "980",
      temperature: "29.4",
      notes: "Example values for demonstration only – not a real measurement.",
    });
    toast.info("Example values filled in", { description: "These are illustrative numbers, not a real measurement." });
  };

  const useLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location is not available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude.toFixed(5), { shouldValidate: true });
        setValue("longitude", pos.coords.longitude.toFixed(5), { shouldValidate: true });
        setLocating(false);
      },
      () => {
        toast.error("Could not get your location", { description: "Allow location access or type the coordinates." });
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const save = async (v: SampleFormValues, mlResult: MlResult | null) => {
    try {
      const id = await addSample({
        label: v.label.trim(),
        siteName: v.siteName.trim(),
        waterSource: v.waterSource,
        collectedAt: v.collectedAt,
        latitude: v.latitude === "" ? null : Number(v.latitude),
        longitude: v.longitude === "" ? null : Number(v.longitude),
        notes: v.notes.trim(),
        ph: Number(v.ph),
        turbidity: Number(v.turbidity),
        dissolvedOxygen: Number(v.dissolvedOxygen),
        conductivity: Number(v.conductivity),
        temperature: Number(v.temperature),
        isDemo: false,
        createdAt: new Date().toISOString(),
        mlResult,
      });
      toast.success(mlResult ? `Saved — model result: ${mlResult.status}` : "Saved without a model check");
      navigate({ to: "/samples/$id", params: { id: String(id) } });
    } catch (e) {
      console.error(e);
      toast.error("The sample could not be saved", { description: "Your browser may be blocking local storage (e.g. private mode)." });
    }
  };

  /** Sends the readings to the real Isolation Forest backend; saves only after a real answer. */
  const analyse = async (v: SampleFormValues) => {
    setPending(v);
    const out = await ml.run({
      conductivity: Number(v.conductivity),
      turbidity: Number(v.turbidity),
      temperature: Number(v.temperature),
    });
    if (out.ok) await save(v, out.result);
    else toast.error("Model check failed", { description: out.message });
  };

  const onSubmit = handleSubmit(analyse, () => toast.error("Please correct the highlighted fields"));

  return (
    <div>
      <PageHeader
        eyebrow="Water analysis"
        title="Analyse a water sample"
        description="Enter the readings from your field meters. Every field explains what it measures and the units to use. Conductivity, turbidity and temperature are sent to the Isolation Forest model on the AquaSentinel server; the sample is then saved on this device."
        actions={
          <Button type="button" variant="outline" onClick={fillExample}>
            <Wand2 /> Fill example values
          </Button>
        }
      />

      <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="1. Sample details" description="Where and when was the water collected?">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sample name" error={errors.label?.message} htmlFor="label">
                <Input id="label" placeholder="e.g. School pond – morning" {...register("label")} aria-invalid={!!errors.label} />
              </Field>
              <Field label="Location name" error={errors.siteName?.message} htmlFor="siteName">
                <Input id="siteName" placeholder="e.g. North bank, Green Lake" {...register("siteName")} aria-invalid={!!errors.siteName} />
              </Field>
              <Field label="Water source" error={errors.waterSource?.message} htmlFor="waterSource">
                <select
                  id="waterSource"
                  {...register("waterSource")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {WATER_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </Field>
              <Field label="Collection date" error={errors.collectedAt?.message} htmlFor="collectedAt">
                <Input id="collectedAt" type="date" {...register("collectedAt")} aria-invalid={!!errors.collectedAt} />
              </Field>
              <Field label="Latitude (optional)" error={errors.latitude?.message} htmlFor="latitude" hint="Decimal degrees, e.g. 22.5726">
                <Input id="latitude" inputMode="decimal" placeholder="22.5726" {...register("latitude")} aria-invalid={!!errors.latitude} />
              </Field>
              <Field label="Longitude (optional)" error={errors.longitude?.message} htmlFor="longitude" hint="Needed to show the sample on the map">
                <div className="flex gap-2">
                  <Input id="longitude" inputMode="decimal" placeholder="88.3639" {...register("longitude")} aria-invalid={!!errors.longitude} />
                  <Button type="button" variant="outline" size="icon" onClick={useLocation} aria-label="Use my current location" title="Use my current location">
                    {locating ? <Loader2 className="animate-spin" /> : <Crosshair />}
                  </Button>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="2. Measurements" description="Type the value shown on your instrument. Use a dot for decimals.">
            <div className="grid gap-5 md:grid-cols-2">
              {PARAMETER_KEYS.map((k) => {
                const def = PARAMETERS[k];
                const err = errors[k]?.message;
                return (
                  <div key={k} className="rounded-lg border bg-surface p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor={k} className="text-sm font-semibold text-foreground">{def.label}</Label>
                      <span className="font-mono text-xs text-muted-foreground">{def.unit}</span>
                    </div>
                    <div className="relative mt-2">
                      <Input
                        id={k}
                        inputMode="decimal"
                        placeholder={def.placeholder}
                        className="pr-20 font-mono text-base"
                        aria-invalid={!!err}
                        aria-describedby={`${k}-help`}
                        {...register(k)}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-muted-foreground">{def.unit}</span>
                    </div>
                    {err ? (
                      <p className="mt-1.5 text-xs font-medium text-destructive">{err}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">Allowed: {def.min} – {def.max.toLocaleString("en-US")} · Reference: {def.referenceText}</p>
                    )}
                    <p id={`${k}-help`} className="mt-2 flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
                      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" /> {def.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="3. Notes (optional)">
            <Textarea placeholder="Weather, smell, colour, nearby activities…" rows={3} {...register("notes")} />
            {errors.notes && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.notes.message}</p>}
          </Panel>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel title="Rule-based preview" description="Instant indicator index from the documented rules — not the machine-learning model.">
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <WqiGauge value={preview.wqi} category={preview.category} size={140} />
                <CategoryBadge category={preview.category} />
                <ul className="mt-2 w-full space-y-1.5">
                  {preview.parameters.map((p) => (
                    <li key={p.key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{PARAMETERS[p.key].label}</span>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Enter all five measurements to see a preview.</p>
            )}
          </Panel>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || ml.running}>
            {isSubmitting || ml.running ? <Loader2 className="animate-spin" /> : <BrainCircuit />} Analyse with ML model & save
          </Button>
          {ml.running && <MlLoading elapsed={ml.elapsed} />}
          {ml.error && !ml.running && pending && (
            <MlError
              message={ml.error}
              onRetry={() => void analyse(pending)}
              extra={
                <Button size="sm" variant="ghost" type="button" onClick={() => void save(pending, null)}>
                  <Save /> Save without model check
                </Button>
              }
            />
          )}
          <MlDisclaimer />
          <SafetyNotice compact />
        </aside>
      </form>
    </div>
  );
}

function Field({ label, error, hint, htmlFor, children }: { label: string; error?: string | undefined; hint?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
