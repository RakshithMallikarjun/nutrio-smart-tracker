import { Link } from "@tanstack/react-router";
import { Scale, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useWeightLogs, displayWeight, type WeightUnit } from "@/hooks/use-weight-logs";

type Props = { userId: string | undefined; unit: WeightUnit };

export function WeightSummaryCard({ userId, unit }: Props) {
  const { logs } = useWeightLogs(userId);
  const latest = logs[0];
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  const ref = [...logs].reverse().find((l) => new Date(l.log_date) <= monthAgo) ?? logs[logs.length - 1];

  const unitLabel = unit === "kg" ? "kg" : "lb";

  if (!latest) {
    return (
      <Link
        to="/weight"
        className="mx-5 mt-3 flex items-center justify-between rounded-[1.5rem] bg-white p-3.5 sage-border-soft"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(122,153,144,0.15)" }}>
            <Scale size={20} color="#7a9990" />
          </div>
          <div>
            <p className="text-label" style={{ color: "#b7c6c2" }}>Body weight</p>
            <p className="text-sm font-extrabold text-charcoal">Add your first weight entry</p>
          </div>
        </div>
        <ChevronRight color="#b7c6c2" />
      </Link>
    );
  }

  const change = ref && ref.id !== latest.id ? latest.weight_kg - ref.weight_kg : 0;
  const TrendIcon = change < -0.1 ? TrendingDown : change > 0.1 ? TrendingUp : Minus;
  const trendColor = change < -0.1 ? "#7a9990" : change > 0.1 ? "#ca0013" : "#b7c6c2";

  return (
    <Link
      to="/weight"
      className="mx-5 mt-3 flex items-center justify-between rounded-[1.5rem] bg-white p-3.5 sage-border-soft"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(122,153,144,0.15)" }}>
          <Scale size={20} color="#7a9990" />
        </div>
        <div className="min-w-0">
          <p className="text-label" style={{ color: "#b7c6c2" }}>Body weight</p>
          <p className="text-base font-black leading-tight text-charcoal">
            {displayWeight(latest.weight_kg, unit).toFixed(1)}
            <span className="ml-1 text-xs font-bold" style={{ color: "#b7c6c2" }}>{unitLabel}</span>
          </p>
          {ref && ref.id !== latest.id && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold" style={{ color: trendColor }}>
              <TrendIcon size={11} />
              {change > 0 ? "+" : ""}{displayWeight(change, unit).toFixed(1)} {unitLabel} this month
            </p>
          )}
        </div>
      </div>
      <ChevronRight color="#b7c6c2" className="shrink-0" />
    </Link>
  );
}
