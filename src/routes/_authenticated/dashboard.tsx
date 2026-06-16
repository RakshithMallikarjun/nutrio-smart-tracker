import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flame, Droplet, Trash2, Sparkles, ChevronRight, LogOut, Camera, Mic, ScanBarcode, Pencil, Loader2, Copy, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNutrioCloud } from "@/hooks/use-nutrio-cloud";
import { useStreak } from "@/hooks/use-streak";
import { useYesterdayMeals } from "@/hooks/use-yesterday-meals";
import { MEAL_EMOJI, MEAL_LABELS, type MealType, type Food } from "@/lib/nutrio-data";
import { Ring } from "@/components/nutrio/Ring";
import { MacroBar } from "@/components/nutrio/MacroBar";
import { BottomNav, type Tab } from "@/components/nutrio/BottomNav";
import { FoodSearchSheet } from "@/components/nutrio/FoodSearchSheet";
import { WaterSheet } from "@/components/nutrio/WaterSheet";
import { AiPhotoSheet } from "@/components/nutrio/AiPhotoSheet";
import { VoiceLogSheet } from "@/components/nutrio/VoiceLogSheet";
import { BarcodeSheet } from "@/components/nutrio/BarcodeSheet";
import { EditMealSheet } from "@/components/nutrio/EditMealSheet";
import { NutrioLoader } from "@/components/nutrio/NutrioLoader";
import { Walkthrough } from "@/components/nutrio/Walkthrough";
import { ReminderConsentModal } from "@/components/nutrio/ReminderConsentModal";
import { MealReminderPopup } from "@/components/nutrio/MealReminderPopup";
import { StreakCard } from "@/components/nutrio/StreakCard";
import { WeightSummaryCard } from "@/components/nutrio/WeightSummaryCard";
import { CopyYesterdaySheet } from "@/components/nutrio/CopyYesterdaySheet";
import type { MealRow } from "@/hooks/use-nutrio-cloud";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { identifyUser, track, resetUser } from "@/lib/analytics";
import type { WeightUnit } from "@/hooks/use-weight-logs";

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
const MEAL_STORE_KEY = "nutrio:selected-meal";

function autoMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const store = useNutrioCloud(user?.id);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [activeMeal, setActiveMeal] = useState<MealType>(autoMeal());
  const [foodOpen, setFoodOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<MealRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [copyMeal, setCopyMeal] = useState<MealType | null>(null);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("weight_unit").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.weight_unit === "lb" || data?.weight_unit === "kg") setWeightUnit(data.weight_unit);
    });
  }, [user?.id]);

  useEffect(() => {
    const t = setTimeout(() => setBootLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user?.id && store.displayName && store.displayName !== "there") {
      identifyUser(user.id, store.displayName);
    }
  }, [user?.id, store.displayName]);

  // Restore last-selected meal across sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(MEAL_STORE_KEY) as MealType | null;
    if (saved && MEALS.includes(saved)) setActiveMeal(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(MEAL_STORE_KEY, activeMeal);
  }, [activeMeal]);

  const remaining = Math.max(0, store.goals.calories - store.totals.calories);
  const mealMap = useMemo(() => {
    const map = new Map<MealType, typeof store.meals>();
    MEALS.forEach((m) => map.set(m, []));
    store.meals.forEach((entry) => map.get(entry.meal_type)?.push(entry));
    return map;
  }, [store.meals]);
  const mealsForActive = mealMap.get(activeMeal) ?? [];

  const confirmSignOut = async () => {
    resetUser();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (bootLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center" style={{ backgroundColor: "#eeebe3" }}>
        <NutrioLoader />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-32" style={{ backgroundColor: "#eeebe3" }}>
      <Walkthrough />
      <ReminderConsentModal userId={user?.id} />
      <MealReminderPopup
        loggedMealTypes={new Set(store.meals.map((m) => m.meal_type))}
        onLogMeal={(meal) => {
          setActiveMeal(meal);
          setFoodOpen(true);
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12">
        <div className="min-w-0 flex-1">
          <p className="text-label" style={{ color: "#b7c6c2" }}>Good morning</p>
          <h1 className="mt-1 truncate text-[26px] font-black leading-tight text-charcoal">
            Hello, {store.displayName}
          </h1>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-1.5">
          <button onClick={() => setSignOutOpen(true)} aria-label="Sign out" className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border">
            <LogOut size={18} />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-full text-base font-black text-white" style={{ backgroundColor: "#171e19", border: "2px solid #ffffff" }}>
            {store.displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Hero card */}
      <section className="relative mx-5 mt-5 overflow-hidden rounded-[2rem] bg-white p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full" style={{ backgroundColor: "rgba(183,198,194,0.22)" }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl">🔥</div>
          <div className="min-w-0">
            <p className="text-label" style={{ color: "#b7c6c2" }}>Today's intake</p>
            <p className="text-2xl font-black leading-tight text-charcoal">{Math.round(store.totals.calories)} kcal</p>
            <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>of {store.goals.calories} kcal goal</p>
          </div>
        </div>

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

        <div className="mt-4 flex items-center gap-2.5 rounded-2xl p-3" style={{ backgroundColor: "rgba(183,198,194,0.2)" }}>
          <Sparkles size={16} color="#171e19" className="shrink-0" />
          <p className="text-xs font-bold leading-snug text-charcoal">
            {store.goals.calories > 0
              ? `${Math.round((store.totals.calories / store.goals.calories) * 100)}% of daily calories logged.`
              : "Set your calorie goal to track progress."}
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <div className="mx-5 mt-3 grid grid-cols-3 gap-2">
        <QuickAction icon={<Mic size={16} />} label="Voice" onClick={() => { setVoiceOpen(true); track("voice_log_opened"); }} />
        <QuickAction icon={<Camera size={16} />} label="Scan dish" onClick={() => { setAiOpen(true); track("ai_scan_opened"); }} />
        <QuickAction icon={<ScanBarcode size={16} />} label="Barcode" onClick={() => { setBarcodeOpen(true); track("barcode_opened"); }} />
      </div>

      {/* Water widget */}
      <button onClick={() => { setWaterOpen(true); track("water_opened"); }} className="mx-5 mt-3 flex w-[calc(100%-2.5rem)] items-center justify-between rounded-[1.5rem] bg-white p-3.5 text-left sage-border-soft">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(202,0,19,0.1)" }}>
            <Droplet size={20} color="#ca0013" />
          </div>
          <div className="min-w-0">
            <p className="text-label" style={{ color: "#b7c6c2" }}>Water</p>
            <p className="text-base font-black leading-tight text-charcoal">
              {(store.waterTotal / 1000).toFixed(2)}
              <span className="ml-1 text-xs font-bold" style={{ color: "#b7c6c2" }}>/ {(store.goals.water_ml / 1000).toFixed(1)} L</span>
            </p>
            <div className="mt-1 h-1.5 w-32 rounded-full" style={{ backgroundColor: "rgba(183,198,194,0.3)" }}>
              <div className="h-1.5 rounded-full transition-[width]" style={{ width: `${Math.min(100, (store.waterTotal / store.goals.water_ml) * 100)}%`, backgroundColor: "#ca0013" }} />
            </div>
          </div>
        </div>
        <ChevronRight color="#b7c6c2" className="shrink-0" />
      </button>

      {/* Today's overview */}
      <section className="mx-5 mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-charcoal">Today's Overview</h2>
          <span className="text-label" style={{ color: "#b7c6c2" }}>
            {Math.round(store.totals.calories)} / {store.goals.calories} kcal
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => {
            const items = mealMap.get(m) ?? [];
            const kcal = items.reduce((a, b) => a + Number(b.calories), 0);
            const active = m === activeMeal;
            return (
              <button
                key={m}
                onClick={() => { setActiveMeal(m); track("meal_tab_switched", { meal: m }); }}
                className="flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition-colors"
                style={{
                  backgroundColor: active ? "#171e19" : "#ffffff",
                  border: active ? "none" : "1px solid rgba(183,198,194,0.5)",
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: active ? "#ca0013" : "rgba(202,0,19,0.1)" }}>
                  {MEAL_EMOJI[m]}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: active ? "rgba(255,255,255,0.6)" : "#b7c6c2" }}>
                    {MEAL_LABELS[m]}
                  </p>
                  <p className="text-sm font-extrabold" style={{ color: active ? "#ffffff" : "#171e19" }}>{Math.round(kcal)} kcal</p>
                  <p className="text-[10px] font-bold" style={{ color: active ? "rgba(255,255,255,0.6)" : "#b7c6c2" }}>
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active meal feed */}
      <section className="mx-5 mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-charcoal">
            {MEAL_LABELS[activeMeal]}
            <span className="ml-1.5 text-sm" style={{ color: "#b7c6c2" }}>· {mealsForActive.length}</span>
          </h2>
          <button onClick={() => { setFoodOpen(true); track("add_food_opened", { source: "meal_header", meal: activeMeal }); }} className="text-label" style={{ color: "#ca0013" }}>+ Add</button>
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
              <li key={m.id} className="animate-fade-in flex items-center gap-3 rounded-2xl bg-white p-3 sage-border">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl" style={{ backgroundColor: "rgba(202,0,19,0.1)" }}>
                  {MEAL_EMOJI[m.meal_type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-extrabold leading-tight text-charcoal">{m.food_name}</p>
                  <p className="mt-0.5 truncate text-[11px] font-bold" style={{ color: "#b7c6c2" }}>
                    {m.serving} · {Math.round(m.calories)} kcal · P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                  </p>
                </div>
                <button onClick={() => { setEditEntry(m); track("meal_edit_opened", { food_name: m.food_name }); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-cream" style={{ border: "1px solid rgba(183,198,194,0.5)" }} aria-label="Edit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => { store.removeMeal(m.id); track("meal_removed", { food_name: m.food_name, meal_type: m.meal_type }); }} className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-vibrant" style={{ border: "1px solid rgba(183,198,194,0.5)" }} aria-label="Remove">
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
          if (t === "trends") navigate({ to: "/weekly" });
          if (t === "water") setWaterOpen(true);
          if (t === "profile") navigate({ to: "/goals" });
        }}
        onAdd={() => { setFoodOpen(true); track("add_food_opened", { source: "fab" }); }}
      />

      <FoodSearchSheet
        open={foodOpen}
        onClose={() => setFoodOpen(false)}
        defaultMeal={activeMeal}
        userId={user?.id}
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

      <AiPhotoSheet
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        userId={user?.id}
        onAdd={(food, meal) => {
          setSyncing(true);
          store.addFood(food, meal);
          setActiveMeal(meal);
          toast.success(`✓ ${food.name} added to ${MEAL_LABELS[meal]}`);
          setTimeout(() => setSyncing(false), 1500);
        }}
      />

      <VoiceLogSheet
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        defaultMeal={activeMeal}
        userId={user?.id}
        onAdd={(food, meal) => {
          setSyncing(true);
          store.addFood(food, meal);
          setActiveMeal(meal);
          setTimeout(() => setSyncing(false), 1500);
        }}
        onAddMany={async (items) => {
          if (items.length === 0) return;
          setSyncing(true);
          try {
            await store.addFoods(items.map((i) => ({ food: i.food, mealType: i.meal })));
            setActiveMeal(items[items.length - 1].meal);
          } finally {
            setTimeout(() => setSyncing(false), 1500);
          }
        }}
      />


      <BarcodeSheet
        open={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        defaultMeal={activeMeal}
        onAdd={(food, meal) => {
          setSyncing(true);
          store.addFood(food, meal);
          setActiveMeal(meal);
          toast.success(`✓ ${food.name} added to ${MEAL_LABELS[meal]}`);
          setTimeout(() => setSyncing(false), 1500);
        }}
      />

      {syncing && (
        <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg sage-border">
          <Loader2 size={14} className="animate-spin" color="#ca0013" />
          <span className="text-xs font-extrabold text-charcoal">Updating your log…</span>
        </div>
      )}


      <EditMealSheet
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSave={(id, patch) => {
          store.updateMeal(id, patch);
          toast.success("Entry updated");
        }}
      />


      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll need to sign back in to access your logs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setSignOutOpen(false)}
              className="flex-1 rounded-full bg-cream py-2.5 text-sm font-extrabold text-charcoal sage-border-soft"
            >
              Cancel
            </button>
            <button
              onClick={confirmSignOut}
              className="flex-1 rounded-full py-2.5 text-sm font-extrabold text-white"
              style={{ backgroundColor: "#ca0013" }}
            >
              Sign Out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-2xl bg-white py-2.5 text-xs font-extrabold text-charcoal transition-colors hover:bg-cream sage-border-soft"
    >
      <span style={{ color: "#ca0013" }}>{icon}</span>
      {label}
    </button>
  );
}
