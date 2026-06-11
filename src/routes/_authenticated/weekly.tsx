import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flame, Droplet, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SafeChart } from "@/components/nutrio/SafeChart";
import { NutrioLoader } from "@/components/nutrio/NutrioLoader";

// Lazy-load recharts-backed chart components so they only download/execute on the client.
const CaloriesChart = lazy(() =>
  import("@/components/nutrio/WeeklyCharts").then((m) => ({ default: m.CaloriesChart })),
);
const MacrosChart = lazy(() =>
  import("@/components/nutrio/WeeklyCharts").then((m) => ({ default: m.MacrosChart })),
);
const WaterChart = lazy(() =>
  import("@/components/nutrio/WeeklyCharts").then((m) => ({ default: m.WaterChart })),
);

export const Route = createFileRoute("/_authenticated/weekly")({
  head: () => ({
    meta: [
      { title: "Weekly Summary — Nutrio" },
      {
        name: "description",
        content: "7-day trends for calories, macros and water with goal progress.",
      },
    ],
  }),
  component: WeeklyPage,
});

type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water_ml: number;
};

type DayRow = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
};

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Timeframe = "daily" | "weekly" | "monthly";
const TF_DAYS: Record<Timeframe, number> = { daily: 1, weekly: 7, monthly: 30 };
const TF_LABEL: Record<Timeframe, string> = { daily: "Today", weekly: "Last 7 days", monthly: "Last 30 days" };

function lastNDays(n: number): { date: string; label: string }[] {
  const arr: { date: string; label: string }[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = n <= 7 ? WEEKDAY[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`;
    arr.push({ date: d.toISOString().slice(0, 10), label });
  }
  return arr;
}

function WeeklyPage() {
  const { user } = Route.useRouteContext();
  const [goals, setGoals] = useState<Goals | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    const range = lastNDays(TF_DAYS[timeframe]);
    const start = range[0].date;
    (async () => {
      const [g, m, w] = await Promise.all([
        supabase.from("goals").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("meal_entries")
          .select("log_date,calories,protein,carbs,fat,fiber")
          .eq("user_id", user.id)
          .gte("log_date", start),
        supabase
          .from("water_entries")
          .select("log_date,quantity_ml")
          .eq("user_id", user.id)
          .gte("log_date", start),
      ]);
      if (g.data) setGoals(g.data as Goals);
      const map: Record<string, DayRow> = {};
      for (const r of range) {
        map[r.date] = {
          date: r.date,
          label: r.label,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          water: 0,
        };
      }
      (m.data ?? []).forEach((r) => {
        const row = map[r.log_date];
        if (!row) return;
        row.calories += Number(r.calories);
        row.protein += Number(r.protein);
        row.carbs += Number(r.carbs);
        row.fat += Number(r.fat);
        row.fiber += Number(r.fiber);
      });
      (w.data ?? []).forEach((r) => {
        const row = map[r.log_date];
        if (row) row.water += Number(r.quantity_ml);
      });
      setDays(Object.values(map));
      setLoading(false);
    })();
  }, [user?.id, timeframe]);

  const totals = useMemo(() => {
    const sum = days.reduce(
      (a, d) => ({
        calories: a.calories + d.calories,
        protein: a.protein + d.protein,
        carbs: a.carbs + d.carbs,
        fat: a.fat + d.fat,
        fiber: a.fiber + d.fiber,
        water: a.water + d.water,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 },
    );
    const n = days.length || 1;
    return {
      avgCalories: Math.round(sum.calories / n),
      avgProtein: Math.round(sum.protein / n),
      avgCarbs: Math.round(sum.carbs / n),
      avgFat: Math.round(sum.fat / n),
      avgFiber: Math.round(sum.fiber / n),
      avgWater: Math.round(sum.water / n),
    };
  }, [days]);

  const progress = (avg: number, goal: number) =>
    goal > 0 ? Math.min(100, Math.round((avg / goal) * 100)) : 0;

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-md pb-16"
      style={{ backgroundColor: "#eeebe3" }}
    >
      <header className="flex items-center gap-3 px-5 pt-12">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="text-label" style={{ color: "#b7c6c2" }}>
            Last 7 days
          </p>
          <h1 className="truncate text-[22px] font-black leading-tight text-charcoal">
            Weekly Summary
          </h1>
        </div>
      </header>

      {loading ? (
        <p className="mt-10 text-center text-sm font-bold" style={{ color: "#b7c6c2" }}>
          Loading your trends…
        </p>
      ) : (
        <>
          {/* Calorie trend */}
          <section className="mx-5 mt-5 rounded-[2rem] bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flame size={16} color="#ca0013" />
              <h2 className="text-base font-black text-charcoal">Calories</h2>
              <span className="ml-auto text-xs font-bold" style={{ color: "#b7c6c2" }}>
                Avg {totals.avgCalories} kcal
              </span>
            </div>
            <SafeChart height={176}>
              <CaloriesChart days={days} goal={goals?.calories} />
            </SafeChart>
            {goals && (
              <ProgressRow
                label="Goal progress"
                value={progress(totals.avgCalories, goals.calories)}
                unit={`${totals.avgCalories} / ${goals.calories} kcal`}
              />
            )}
          </section>

          {/* Macros trend */}
          <section className="mx-5 mt-3 rounded-[2rem] bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={16} color="#171e19" />
              <h2 className="text-base font-black text-charcoal">Macros</h2>
            </div>
            <SafeChart height={192}>
              <MacrosChart days={days} />
            </SafeChart>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-extrabold">
              <LegendDot color="#ca0013" label={`Protein ${totals.avgProtein}g`} />
              <LegendDot color="#171e19" label={`Carbs ${totals.avgCarbs}g`} />
              <LegendDot color="#b7c6c2" label={`Fat ${totals.avgFat}g`} />
              <LegendDot color="#7a9990" label={`Fiber ${totals.avgFiber}g`} />
            </div>
            {goals && (
              <div className="mt-4 space-y-2">
                <ProgressRow
                  label="Protein"
                  value={progress(totals.avgProtein, goals.protein)}
                  unit={`${totals.avgProtein} / ${goals.protein}g`}
                  color="#ca0013"
                />
                <ProgressRow
                  label="Carbs"
                  value={progress(totals.avgCarbs, goals.carbs)}
                  unit={`${totals.avgCarbs} / ${goals.carbs}g`}
                  color="#171e19"
                />
                <ProgressRow
                  label="Fat"
                  value={progress(totals.avgFat, goals.fat)}
                  unit={`${totals.avgFat} / ${goals.fat}g`}
                  color="#b7c6c2"
                />
                <ProgressRow
                  label="Fiber"
                  value={progress(totals.avgFiber, goals.fiber)}
                  unit={`${totals.avgFiber} / ${goals.fiber}g`}
                  color="#7a9990"
                />
              </div>
            )}
          </section>

          {/* Water trend */}
          <section className="mx-5 mt-3 rounded-[2rem] bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Droplet size={16} color="#ca0013" />
              <h2 className="text-base font-black text-charcoal">Hydration</h2>
              <span className="ml-auto text-xs font-bold" style={{ color: "#b7c6c2" }}>
                Avg {(totals.avgWater / 1000).toFixed(2)} L
              </span>
            </div>
            <SafeChart height={160}>
              <WaterChart days={days} goalMl={goals?.water_ml} />
            </SafeChart>
            {goals && (
              <ProgressRow
                label="Goal progress"
                value={progress(totals.avgWater, goals.water_ml)}
                unit={`${(totals.avgWater / 1000).toFixed(2)} / ${(goals.water_ml / 1000).toFixed(1)} L`}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-charcoal">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  unit,
  color = "#171e19",
}: {
  label: string;
  value: number;
  unit: string;
  color?: string;
}) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-extrabold text-charcoal">{label}</span>
        <span className="text-[11px] font-bold" style={{ color: "#b7c6c2" }}>
          {unit} · {value}%
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full"
        style={{ backgroundColor: "rgba(183,198,194,0.3)" }}
      >
        <div
          className="h-2 rounded-full transition-[width]"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
