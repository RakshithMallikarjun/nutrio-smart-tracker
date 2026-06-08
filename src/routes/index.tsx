import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Flame, Droplet, Trash2, Sparkles, ChevronRight } from "lucide-react";
import { useNutrioStore } from "@/hooks/use-nutrio-store";
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from "@/lib/nutrio-data";
import { Ring } from "@/components/nutrio/Ring";
import { MacroBar } from "@/components/nutrio/MacroBar";
import { BottomNav, type Tab } from "@/components/nutrio/BottomNav";
import { FoodSearchSheet } from "@/components/nutrio/FoodSearchSheet";
import { WaterSheet } from "@/components/nutrio/WaterSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nutrio — Track Calories, Macros & Water" },
      { name: "description", content: "A sophisticated mobile-first nutrition companion. Log meals, track macros, hit your hydration goal." },
      { property: "og:title", content: "Nutrio — Track Calories, Macros & Water" },
      { property: "og:description", content: "A sophisticated mobile-first nutrition companion." },
    ],
  }),
  component: Dashboard,
});

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function Dashboard() {
  const store = useNutrioStore();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");
  const [foodOpen, setFoodOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);

  const remaining = Math.max(0, store.goals.calories - store.totals.calories);
  const mealsForActive = useMemo(
    () => store.meals.map((m, i) => ({ ...m, _i: i })).filter((m) => m.mealType === activeMeal),
    [store.meals, activeMeal],
  );

  const mealCalories = (m: MealType) =>
    store.meals.filter((x) => x.mealType === m).reduce((a, b) => a + b.calories, 0);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-32" style={{ backgroundColor: "#eeebe3" }}>
      {/* Header */}
      <header className="flex items-start justify-between px-6 pt-14">
        <div>
          <p className="text-label" style={{ color: "#b7c6c2" }}>Good morning</p>
          <h1 className="mt-1 text-[30px] font-black leading-tight text-charcoal">Hello, Alex</h1>
        </div>
        <div className="relative">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white"
            style={{ backgroundColor: "#171e19", border: "2px solid #ffffff" }}
          >
            A
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full"
            style={{ backgroundColor: "#ca0013", border: "2px solid #eeebe3" }}
          >
            <Bell size={8} color="#fff" strokeWidth={3} />
          </div>
        </div>
      </header>

      {/* Horizontal meal selector */}
      <div className="mt-6 flex gap-3 overflow-x-auto px-6 pb-2" style={{ scrollSnapType: "x mandatory" }}>
        {MEALS.map((m) => {
          const active = m === activeMeal;
          const kcal = mealCalories(m);
          if (active) {
            return (
              <button
                key={m}
                onClick={() => setActiveMeal(m)}
                className="flex h-14 w-40 shrink-0 items-center gap-3 rounded-2xl px-2 transition-all"
                style={{ backgroundColor: "#171e19", scrollSnapAlign: "start" }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: "#ca0013" }}
                >
                  {MEAL_EMOJI[m]}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {MEAL_LABELS[m]}
                  </span>
                  <span className="text-sm font-extrabold text-white">{kcal} kcal</span>
                </div>
              </button>
            );
          }
          return (
            <button
              key={m}
              onClick={() => setActiveMeal(m)}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl transition-transform hover:scale-105 sage-border-soft"
              style={{ scrollSnapAlign: "start" }}
              aria-label={MEAL_LABELS[m]}
            >
              {MEAL_EMOJI[m]}
            </button>
          );
        })}
      </div>

      {/* Hero card */}
      <section className="relative mx-6 mt-4 overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
          style={{ backgroundColor: "rgba(183,198,194,0.25)" }}
        />
        <div className="relative flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream text-3xl">🔥</div>
          <div>
            <p className="text-label" style={{ color: "#b7c6c2" }}>Today's intake</p>
            <p className="text-3xl font-black text-charcoal">{Math.round(store.totals.calories)} kcal</p>
            <p className="text-sm font-bold" style={{ color: "#b7c6c2" }}>
              of {store.goals.calories} kcal goal
            </p>
          </div>
        </div>

        {/* Ring + macros grid */}
        <div className="mt-6 grid grid-cols-[auto_1fr] gap-5">
          <Ring value={store.totals.calories} max={store.goals.calories} size={150} stroke={12}>
            <Flame size={20} color="#ca0013" />
            <p className="mt-1 text-2xl font-black text-charcoal">{remaining}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>kcal left</p>
          </Ring>
          <div className="grid grid-cols-2 gap-2">
            <MacroBar label="Protein" value={store.totals.protein} max={store.goals.protein} color="#ca0013" />
            <MacroBar label="Carbs" value={store.totals.carbs} max={store.goals.carbs} color="#171e19" />
            <MacroBar label="Fat" value={store.totals.fat} max={store.goals.fat} color="#b7c6c2" />
            <MacroBar label="Fiber" value={store.totals.fiber} max={store.goals.fiber} color="#7a9990" />
          </div>
        </div>

        {/* Alert / info box */}
        <div
          className="mt-5 flex items-center gap-3 rounded-2xl p-3"
          style={{ backgroundColor: "rgba(183,198,194,0.2)" }}
        >
          <Sparkles size={18} color="#171e19" />
          <p className="text-xs font-bold text-charcoal">
            You're on track! {Math.round((store.totals.calories / store.goals.calories) * 100)}% of daily calories logged.
          </p>
        </div>
      </section>

      {/* Water widget */}
      <button
        onClick={() => setWaterOpen(true)}
        className="mx-6 mt-4 flex w-[calc(100%-3rem)] items-center justify-between rounded-[2rem] bg-white p-4 text-left sage-border-soft"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(202,0,19,0.1)" }}
          >
            <Droplet size={22} color="#ca0013" />
          </div>
          <div>
            <p className="text-label" style={{ color: "#b7c6c2" }}>Water</p>
            <p className="text-lg font-black text-charcoal">
              {(store.waterTotal / 1000).toFixed(2)} <span className="text-sm" style={{ color: "#b7c6c2" }}>/ {(store.goals.water / 1000).toFixed(1)} L</span>
            </p>
            <div className="mt-1 h-1.5 w-40 rounded-full" style={{ backgroundColor: "rgba(183,198,194,0.3)" }}>
              <div
                className="h-1.5 rounded-full transition-[width]"
                style={{
                  width: `${Math.min(100, (store.waterTotal / store.goals.water) * 100)}%`,
                  backgroundColor: "#ca0013",
                }}
              />
            </div>
          </div>
        </div>
        <ChevronRight color="#b7c6c2" />
      </button>

      {/* Active meal feed */}
      <section className="mx-6 mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black text-charcoal">
            {MEAL_LABELS[activeMeal]} <span style={{ color: "#b7c6c2" }}>· {mealsForActive.length} items</span>
          </h2>
          <button
            onClick={() => setFoodOpen(true)}
            className="text-label text-vibrant"
            style={{ color: "#ca0013" }}
          >
            + Add
          </button>
        </div>

        {mealsForActive.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center sage-border">
            <p className="text-3xl">{MEAL_EMOJI[activeMeal]}</p>
            <p className="mt-2 text-sm font-extrabold text-charcoal">No {MEAL_LABELS[activeMeal].toLowerCase()} logged yet</p>
            <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>Tap the red button below to add your first item.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {mealsForActive.map((m) => (
              <li
                key={m._i}
                className="animate-fade-in flex items-center gap-3 rounded-2xl bg-white p-3 sage-border"
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: "rgba(202,0,19,0.1)" }}
                >
                  {MEAL_EMOJI[m.mealType]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-extrabold text-charcoal">{m.name}</p>
                  <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>
                    {m.serving} · {m.calories} kcal · P{m.protein} C{m.carbs} F{m.fat}
                  </p>
                </div>
                <button
                  onClick={() => store.removeMeal(m._i)}
                  className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-vibrant"
                  style={{ border: "1px solid rgba(183,198,194,0.5)" }}
                  aria-label="Remove"
                >
                  <Trash2 size={16} className="group-hover:text-white" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomNav
        active={activeTab}
        onChange={(t) => {
          setActiveTab(t);
          if (t === "search") setFoodOpen(true);
          if (t === "water") setWaterOpen(true);
        }}
        onAdd={() => setFoodOpen(true)}
      />

      <FoodSearchSheet
        open={foodOpen}
        onClose={() => setFoodOpen(false)}
        onAdd={(food, meal) => {
          store.addFood(food, meal);
          setActiveMeal(meal);
        }}
      />

      <WaterSheet
        open={waterOpen}
        onClose={() => setWaterOpen(false)}
        total={store.waterTotal}
        goal={store.goals.water}
        onAdd={store.addWater}
        onUndo={store.undoWater}
      />
    </div>
  );
}
