import { ShieldAlert } from "lucide-react";
import { SAFETY_DISCLAIMER } from "@/lib/water/report";

export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
      <ShieldAlert className="mt-0.5 size-5 shrink-0" />
      <p className="leading-relaxed">
        <strong className="font-semibold">Not a drinking-water safety test. </strong>
        {compact
          ? "These five indicators cannot detect germs, metals or most chemicals. Use an accredited laboratory before drinking untreated water."
          : SAFETY_DISCLAIMER}
      </p>
    </div>
  );
}
