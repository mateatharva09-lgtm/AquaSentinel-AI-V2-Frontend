import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, STATUS_LABELS, type Category, type ParameterStatus } from "@/lib/water/model";
import { CATEGORY_STYLES, STATUS_STYLES } from "./status";
import { FlaskConical } from "lucide-react";

export function CategoryBadge({ category, short = false, className }: { category: Category; short?: boolean; className?: string }) {
  const s = CATEGORY_STYLES[category];
  const label = short ? CATEGORY_LABELS[category].split(" ")[0] : CATEGORY_LABELS[category];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.soft, s.text, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: ParameterStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", s.soft, s.text)}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground", className)}
      title="Synthetic demonstration data – not a real measurement"
    >
      <FlaskConical className="size-3" /> Demo data
    </span>
  );
}
