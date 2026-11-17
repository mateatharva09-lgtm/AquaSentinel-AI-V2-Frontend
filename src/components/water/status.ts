import type { Category, ConfidenceLevel, ParameterStatus } from "@/lib/water/model";

/** Static class names per category so Tailwind can see them. */
export const CATEGORY_STYLES: Record<Category, { text: string; bg: string; soft: string; stroke: string; fill: string; dot: string }> = {
  excellent: { text: "text-status-excellent", bg: "bg-status-excellent", soft: "bg-status-excellent/12", stroke: "stroke-status-excellent", fill: "var(--status-excellent)", dot: "bg-status-excellent" },
  good: { text: "text-status-good", bg: "bg-status-good", soft: "bg-status-good/12", stroke: "stroke-status-good", fill: "var(--status-good)", dot: "bg-status-good" },
  fair: { text: "text-warning-foreground", bg: "bg-status-fair", soft: "bg-status-fair/18", stroke: "stroke-status-fair", fill: "var(--status-fair)", dot: "bg-status-fair" },
  poor: { text: "text-status-poor", bg: "bg-status-poor", soft: "bg-status-poor/12", stroke: "stroke-status-poor", fill: "var(--status-poor)", dot: "bg-status-poor" },
  "very-poor": { text: "text-status-critical", bg: "bg-status-critical", soft: "bg-status-critical/12", stroke: "stroke-status-critical", fill: "var(--status-critical)", dot: "bg-status-critical" },
};

export const STATUS_STYLES: Record<ParameterStatus, { text: string; soft: string; bar: string }> = {
  normal: { text: "text-status-excellent", soft: "bg-status-excellent/12", bar: "bg-status-excellent" },
  watch: { text: "text-warning-foreground", soft: "bg-status-fair/20", bar: "bg-status-fair" },
  concern: { text: "text-status-poor", soft: "bg-status-poor/12", bar: "bg-status-poor" },
  critical: { text: "text-status-critical", soft: "bg-status-critical/12", bar: "bg-status-critical" },
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence – near a boundary",
};
