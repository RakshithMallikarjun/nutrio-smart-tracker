import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Flame, Droplet, Trash2, Sparkles, ChevronRight, Settings, LogOut, TrendingUp, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNutrioCloud } from "@/hooks/use-nutrio-cloud";
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from "@/lib/nutrio-data";
import { Ring } from "@/components/nutrio/Ring";
import { MacroBar } from "@/components/nutrio/MacroBar";
import { BottomNav, type Tab } from "@/components/nutrio/BottomNav";
import { FoodSearchSheet } from "@/components/nutrio/FoodSearchSheet";
import { WaterSheet } from "@/components/nutrio/WaterSheet";
import { AiPhotoSheet } from "@/components/nutrio/AiPhotoSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nutrio" },
      { name: "description", content: "Your daily calories, macros and hydration at a glance." },
    ],
  }),
  component: Dashboard,
});

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function Dashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const store = useNutrioCloud(user?.id);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");
  const [foodOpen, setFoodOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [displayName, setDisplayName] = useState("there");

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.name) setDisplayName(data.name.split(" ")[0]);
    });
  }, [user?.id]);

  const remaining = Math.max(0, store.goals.calories - store.totals.calories);
  const mealsForActive = useMemo(
    () => store.meals.filter((m) => m.meal_type === activeMeal),
    [store.meals, activeMeal],
  );

  const mealCalories = (m: MealType) =>
    store.meals.filter((x) => x.meal_type === m).reduce((a, b) => a + Number(b.calories), 0);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-32" style={{ backgroundColor: "#eeebe3" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12">
        <div className="min-w-0 flex-1">
          <p className="text-label" style={{ color: "#b7c6c2" }}>Good morning</p>
          <h1 className="mt-1 truncate text-[26px] font-black leading-tight text-charcoal">
            Hello, {displayName}
          </h1>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <Link
            to="/weekly"
            aria-label="Weekly summary"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border"
          >
            <TrendingUp size={18} />
          </Link>
          <Link
            to="/goals"
            aria-label="Goals"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border"
          >
            <Settings size={18} />
          </Link>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border"
          >
            <LogOut size={18} />
          </button>
          <div className="relative">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-base font-black text-white"
              style={{ backgroundColor: "#171e19", border: "2px solid #ffffff" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full"
              style={{ backgroundColor: "#ca0013", border: "2px solid #eeebe3" }}
            >
              <Bell size={8} color="#fff" strokeWidth={3} />
            </div>
          </div>
        </div>
      </header>

      {/* Horizontal meal selector */}
      <div className="mt-5 flex gap-2.5 overflow-x-auto px-5 pb-2" style={{ scrollSnapType: "x mandatory" }}>
        {MEALS.map((m) => {
          const active = m === activeMeal;
          const kcal = mealCalories(m);
          if (active) {
            return (
              <button
                key={m}
                onClick={() => setActiveMeal(m)}
                className="flex h-14 shrink-0 items-center gap-2.5 rounded-2xl pl-2 pr-4"
                style={{ backgroundColor: "#171e19", scrollSnapAlign: "start" }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: "#ca0013" }}
                >
                  {MEAL_EMOJI[m]}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
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
      <section className="relative mx-5 mt-3 overflow-hidden rounded-[2rem] bg-white p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
          style={{ backgroundColor: "rgba(183,198,194,0.22)" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl">🔥</div>
          <div className="min-w-0">
            <p className="text-label" style={{ color: "#b7c6c2" }}>Today's intake</p>
            <p className="text-2xl font-black leading-tight text-charcoal">{Math.round(store.totals.calories)} kcal</p>
            <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>
              of {store.goals.calories} kcal goal
            </p>
          </div>
        </div>

        {/* Ring + macros — stacked vertically to avoid overlap on narrow screens */}
        <div className="mt-5 flex flex-col items-center gap-5">
          <Ring value={store.totals.calories} max={store.goals.calories} size={150} stroke={12}>
            <Flame size={18} color="#ca0013" />
            <p className="mt-1 text-2xl font-black leading-none text-charcoal">{remaining}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>kcal left</p>
          </Ring>

          <div className="grid w-full grid-cols-2 gap-2">
            <MacroBar label="Protein" value={store.totals.protein} max={store.goals.protein} color="#ca0013" />
            <MacroBar label="Carbs" value={store.totals.carbs} max={store.goals.carbs} color="#171e19" />
            <MacroBar label="Fat" value={store.totals.fat} max={store.goals.fat} color="#b7c6c2" />
            <MacroBar label="Fiber" value={store.totals.fiber} max={store.goals.fiber} color="#7a9990" />
          </div>
        </div>

        {/* Alert / info box */}
        <div
          className="mt-4 flex items-center gap-2.5 rounded-2xl p-3"
          style={{ backgroundColor: "rgba(183,198,194,0.2)" }}
        >
          <Sparkles size={16} color="#171e19" className="shrink-0" />
          <p className="text-xs font-bold leading-snug text-charcoal">
            {store.goals.calories > 0
              ? `${Math.round((store.totals.calories / store.goals.calories) * 100)}% of daily calories logged.`
              : "Set your calorie goal to track progress."}
          </p>
        </div>
      </section>

      {/* Water widget */}
      <button
        onClick={() => setWaterOpen(true)}
        className="mx-5 mt-3 flex w-[calc(100%-2.5rem)] items-center justify-between rounded-[1.5rem] bg-white p-3.5 text-left sage-border-soft"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(202,0,19,0.1)" }}
          >
            <Droplet size={20} color="#ca0013" />
          </div>
          <div className="min-w-0">
            <p className="text-label" style={{ color: "#b7c6c2" }}>Water</p>
            <p className="text-base font-black leading-tight text-charcoal">
              {(store.waterTotal / 1000).toFixed(2)}
              <span className="ml-1 text-xs font-bold" style={{ color: "#b7c6c2" }}>
                / {(store.goals.water_ml / 1000).toFixed(1)} L
              </span>
            </p>
            <div className="mt-1 h-1.5 w-32 rounded-full" style={{ backgroundColor: "rgba(183,198,194,0.3)" }}>
              <div
                className="h-1.5 rounded-full transition-[width]"
                style={{
                  width: `${Math.min(100, (store.waterTotal / store.goals.water_ml) * 100)}%`,
                  backgroundColor: "#ca0013",
                }}
              />
            </div>
          </div>
        </div>
        <ChevronRight color="#b7c6c2" className="shrink-0" />
      </button>

      {/* Active meal feed */}
      <section className="mx-5 mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-charcoal">
            {MEAL_LABELS[activeMeal]}
            <span className="ml-1.5 text-sm" style={{ color: "#b7c6c2" }}>· {mealsForActive.length}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white"
              style={{ backgroundColor: "#ca0013" }}
            >
              <Camera size={13} /> Scan
            </button>
            <button
              onClick={() => setFoodOpen(true)}
              className="text-label"
              style={{ color: "#ca0013" }}
            >
              + Add
            </button>
          </div>
        </div>

        {mealsForActive.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-center sage-border">
            <p className="text-3xl">{MEAL_EMOJI[activeMeal]}</p>
            <p className="mt-2 text-sm font-extrabold text-charcoal">No {MEAL_LABELS[activeMeal].toLowerCase()} logged</p>
            <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>Tap the red button below to add an item.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {mealsForActive.map((m) => (
              <li
                key={m.id}
                className="animate-fade-in flex items-center gap-3 rounded-2xl bg-white p-3 sage-border"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
                  style={{ backgroundColor: "rgba(202,0,19,0.1)" }}
                >
                  {MEAL_EMOJI[m.meal_type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-extrabold leading-tight text-charcoal">{m.food_name}</p>
                  <p className="mt-0.5 truncate text-[11px] font-bold" style={{ color: "#b7c6c2" }}>
                    {m.serving} · {Math.round(m.calories)} kcal · P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                  </p>
                </div>
                <button
                  onClick={() => store.removeMeal(m.id)}
                  className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-vibrant"
                  style={{ border: "1px solid rgba(183,198,194,0.5)" }}
                  aria-label="Remove"
                >
                  <Trash2 size={15} className="group-hover:text-white" />
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
          if (t === "profile") navigate({ to: "/goals" });
        }}
        onAdd={() => setFoodOpen(true)}
      />

      <FoodSearchSheet
        open={foodOpen}
        onClose={() => setFoodOpen(false)}
        onAdd={(food, meal) => {
          store.addFood(food, meal);
          setActiveMeal(meal);
          toast.success(`Added to ${MEAL_LABELS[meal]}`);
        }}
      />

      <WaterSheet
        open={waterOpen}
        onClose={() => setWaterOpen(false)}
        total={store.waterTotal}
        goal={store.goals.water_ml}
        onAdd={store.addWater}
        onUndo={store.undoWater}
      />
    </div>
  );
}
