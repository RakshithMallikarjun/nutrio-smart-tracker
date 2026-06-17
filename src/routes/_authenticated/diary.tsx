import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from "@/lib/nutrio-data";
import { BottomNav, type Tab } from "@/components/nutrio/BottomNav";

export const Route = createFileRoute("/_authenticated/diary")({
  head: () => ({
    meta: [{ title: "Diary — Nutrio" }, { name: "description", content: "Browse your daily food log history." }],
  }),
  component: Diary,
});

const BG = "#f5f2ee";
const CARD_BORDER = "0.5px solid #e8e4df";
const DARK = "#1a1a1a";
const MUTED = "#8a8580";
const GREEN = "#22a06b";
const RED = "#e03030";
const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

type Row = {
  id: string; food_name: string; calories: number; meal_type: MealType; log_date: string;
};

function Diary() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [selected, setSelected] = useState(() => ymd(new Date()));
  const [rows, setRows] = useState<Row[]>([]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  useEffect(() => {
    if (!user?.id) return;
    const start = ymd(days[0]);
    const end = ymd(days[6]);
    supabase
      .from("meal_entries")
      .select("id,food_name,calories,meal_type,log_date")
      .eq("user_id", user.id)
      .gte("log_date", start)
      .lte("log_date", end)
      .order("logged_at", { ascending: true })
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [user?.id, days]);

  const today = ymd(new Date());
  const loggedDays = useMemo(() => new Set(rows.map((r) => r.log_date)), [rows]);

  const dayRows = useMemo(() => rows.filter((r) => r.log_date === selected), [rows, selected]);
  const dayTotal = Math.round(dayRows.reduce((a, b) => a + Number(b.calories), 0));
  const monthLabel = weekStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-28" style={{ backgroundColor: BG }}>
      <header className="flex items-center gap-3 px-5 pt-12">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
          style={{ border: CARD_BORDER }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-xs font-semibold" style={{ color: MUTED }}>Diary</p>
          <h1 className="text-[22px] font-black leading-tight" style={{ color: DARK }}>{monthLabel}</h1>
        </div>
      </header>

      {/* week strip */}
      <div className="mx-5 mt-4 flex items-center gap-2">
        <button
          aria-label="Previous week"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
          style={{ border: CARD_BORDER }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-1 justify-between">
          {days.map((d, i) => {
            const key = ymd(d);
            const isSel = key === selected;
            const isFuture = key > today;
            const hasLog = loggedDays.has(key);
            const isPast = key < today;
            const dot = hasLog ? GREEN : isPast ? RED : "rgba(0,0,0,0.18)";
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                disabled={isFuture}
                className="flex h-14 w-9 flex-col items-center justify-center rounded-xl"
                style={{
                  backgroundColor: isSel ? DARK : "transparent",
                  color: isSel ? "#fff" : DARK,
                  opacity: isFuture ? 0.45 : 1,
                }}
              >
                <span className="text-[10px] font-bold" style={{ opacity: 0.7 }}>{DAY_LETTERS[i]}</span>
                <span className="text-[14px] font-black leading-none">{d.getDate()}</span>
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
              </button>
            );
          })}
        </div>
        <button
          aria-label="Next week"
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
          style={{ border: CARD_BORDER }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* total */}
      <section className="mx-5 mt-4 rounded-[20px] p-4" style={{ backgroundColor: DARK, color: "#fff" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
          {new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <p className="mt-1 text-[24px] font-black leading-none">
          {dayTotal}<span className="ml-1 text-sm font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>kcal total</span>
        </p>
      </section>

      {/* meals */}
      <section className="mx-5 mt-3 rounded-[20px] bg-white" style={{ border: CARD_BORDER }}>
        {MEALS.map((m, i) => {
          const items = dayRows.filter((r) => r.meal_type === m);
          const kcal = Math.round(items.reduce((a, b) => a + Number(b.calories), 0));
          return (
            <div key={m} className="px-3 py-2" style={{ borderTop: i === 0 ? "none" : CARD_BORDER }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{MEAL_EMOJI[m]}</span>
                  <span className="text-[12.5px] font-extrabold" style={{ color: DARK }}>{MEAL_LABELS[m]}</span>
                </div>
                <span className="text-[11px] font-extrabold" style={{ color: items.length ? DARK : MUTED }}>
                  {items.length ? `${kcal} kcal` : "—"}
                </span>
              </div>
              {items.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                      style={{ backgroundColor: "#faf8f5", color: DARK, border: CARD_BORDER }}
                    >
                      {it.food_name} · {Math.round(it.calories)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <BottomNav
        active={"diary" as Tab}
        onChange={(t) => {
          if (t === "home") navigate({ to: "/dashboard" });
          else if (t === "trends") navigate({ to: "/weekly" });
          else if (t === "profile") navigate({ to: "/goals" });
        }}
        onAdd={() => navigate({ to: "/dashboard" })}
      />
    </div>
  );
}
