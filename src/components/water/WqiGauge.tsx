import { cn } from "@/lib/utils";
import type { Category } from "@/lib/water/model";
import { CATEGORY_STYLES } from "./status";

export function WqiGauge({ value, category, size = 168 }: { value: number; category: Category; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const filled = arc * Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-[225deg]">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-muted" strokeDasharray={`${arc} ${c}`} />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          className={cn("transition-all duration-700", CATEGORY_STYLES[category].stroke)}
          strokeDasharray={`${filled} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold tabular text-foreground">{value.toFixed(0)}</span>
        <span className="text-xs text-muted-foreground">of 100</span>
      </div>
    </div>
  );
}
