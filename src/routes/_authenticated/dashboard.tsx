import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flame, Mic, Camera, ScanBarcode, Copy, Plus, LogOut, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNutrioCloud } from "@/hooks/use-nutrio-cloud";
import { useStreak } from "@/hooks/use-streak";
import { useYesterdayMeals } from "@/hooks/use-yesterday-meals";
import { useWeightLogs, displayWeight, type WeightUnit } from "@/hooks/use-weight-logs";
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from "@/lib/nutrio-data";
import { Ring } from "@/components/nutrio/Ring";
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
import { CopyYesterdaySheet } from "@/components/nutrio/CopyYesterdaySheet";
import { ProfileMenu } from "@/components/nutrio/ProfileMenu";
import { MealsSummaryModal } from "@/components/nutrio/MealsSummaryModal";
import { ConsistencyTile } from "@/components/nutrio/ConsistencyTile";
import { WaterTile } from "@/components/nutrio/WaterTile";
import { WeightTile } from "@/components/nutrio/WeightTile";
import { QuickLogPanel } from "@/components/nutrio/QuickLogPanel";
import type { MealRow } from "@/hooks/use-nutrio-cloud";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { identifyUser, track, resetUser } from "@/lib/analytics";

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

const BG = "#f5f2ee";
const CARD_BORDER = "0.5px solid #e8e4df";
const RED = "#e03030";
const DARK = "#1a1a1a";
const MUTED = "#8a8580";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

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
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const { logs: weightLogs } = useWeightLogs(user?.id);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(MEAL_STORE_KEY) as MealType | null;
    if (saved && MEALS.includes(saved)) setActiveMeal(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(MEAL_STORE_KEY, activeMeal);
  }, [activeMeal]);

  const calGoal = store.goals.calories || 1;
  const calIntake = Math.round(store.totals.calories);
  const remaining = Math.max(0, store.goals.calories - calIntake);
  const calPct = Math.round((calIntake / calGoal) * 100);

  const mealMap = useMemo(() => {
    const map = new Map<MealType, typeof store.meals>();
    MEALS.forEach((m) => map.set(m, []));
    store.meals.forEach((entry) => map.get(entry.meal_type)?.push(entry));
    return map;
  }, [store.meals]);

  const loggedMealTypes = useMemo(() => new Set(store.meals.map((m) => m.meal_type)), [store.meals]);
  const streak = useStreak({
    userId: user?.id,
    todayMealsByType: loggedMealTypes,
    caloriesToday: store.totals.calories,
    calorieGoal: store.goals.calories,
    waterToday: store.waterTotal,
    waterGoal: store.goals.water_ml,
  });
  const { yesterdayItems } = useYesterdayMeals(user?.id);
  const yesterdayCountFor = (m: MealType) => yesterdayItems.filter((y) => y.meal === m).length;

  // Weight delta over last 30 days (kg)
  const weightDeltaKg = useMemo(() => {
    if (weightLogs.length < 2) return null;
    const latest = weightLogs[0];
    const cutoff = Date.now() - 30 * 86400_000;
    const old = weightLogs.find((l) => new Date(l.log_date).getTime() <= cutoff) ?? weightLogs[weightLogs.length - 1];
    return latest.weight_kg - old.weight_kg;
  }, [weightLogs]);
  const latestWeight = weightLogs[0]?.weight_kg ?? null;

  const confirmSignOut = async () => {
    resetUser();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (bootLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center" style={{ backgroundColor: BG }}>
        <NutrioLoader />
      </div>
    );
  }

  const macros = [
    { label: "Protein", value: store.totals.protein, max: store.goals.protein, color: RED },
    { label: "Carbs", value: store.totals.carbs, max: store.goals.carbs, color: "#f5c542" },
    { label: "Fat", value: store.totals.fat, max: store.goals.fat, color: "#7a9990" },
  ];

  const quickAdds = [
    { icon: <Mic size={18} />, label: "Voice log", onClick: () => { setVoiceOpen(true); track("voice_log_opened"); } },
    { icon: <Camera size={18} />, label: "Scan dish", onClick: () => { setAiOpen(true); track("ai_scan_opened"); } },
    { icon: <ScanBarcode size={18} />, label: "Barcode", onClick: () => { setBarcodeOpen(true); track("barcode_opened"); } },
    { icon: <Copy size={18} />, label: "Copy prev.", onClick: () => { setCopyMeal(autoMeal()); track("copy_yesterday_opened", { source: "quick_action" }); } },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-28" style={{ backgroundColor: BG }}>
      <Walkthrough />
      <ReminderConsentModal userId={user?.id} />
      <MealReminderPopup
        loggedMealTypes={loggedMealTypes}
        onLogMeal={(meal) => {
          setActiveMeal(meal);
          setFoodOpen(true);
        }}
      />

      {/* 1. Header */}
      <header className="flex items-center justify-between px-5 pt-12">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold" style={{ color: MUTED }}>{greeting()}</p>
          <h1 className="mt-0.5 truncate text-[26px] font-black leading-tight" style={{ color: DARK }}>
            Hello, {store.displayName}
          </h1>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <div
            className="flex h-9 items-center gap-1.5 rounded-full px-3"
            style={{ backgroundColor: "#fff4d6", border: "0.5px solid #f0d99a" }}
            aria-label={`Streak ${streak.currentStreak} days`}
          >
            <Flame size={14} color="#d97706" fill="#f59e0b" />
            <span className="text-xs font-extrabold" style={{ color: "#92400e" }}>{streak.currentStreak} {streak.currentStreak === 1 ? "day" : "days"}</span>
          </div>
          <ProfileMenu
            initial={store.displayName.charAt(0).toUpperCase()}
            onViewProfile={() => navigate({ to: "/goals" })}
            onSettings={() => navigate({ to: "/goals" })}
            onSignOut={() => setSignOutOpen(true)}
          />
        </div>
      </header>

      {/* 2. Calorie hero card */}
      <section
        className="mx-5 mt-5 rounded-[20px] p-5"
        style={{ backgroundColor: DARK, color: "#fff" }}
      >
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <Ring
              value={calIntake}
              max={calGoal}
              size={120}
              stroke={11}
              color={RED}
              trackColor="rgba(255,255,255,0.10)"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>kcal left</p>
              <p className="mt-0.5 text-[26px] font-black leading-none">{remaining}</p>
            </Ring>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>Today's intake</p>
            <p className="mt-1 text-[30px] font-black leading-none">{calIntake}<span className="ml-1 text-base font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>kcal</span></p>
            <p className="mt-1 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
              of {store.goals.calories} kcal goal · {calPct}%
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {macros.map((m) => {
            const pct = m.max > 0 ? Math.min(100, (m.value / m.max) * 100) : 0;
            return (
              <div key={m.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>{m.label}</span>
                  <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {Math.round(m.value)}/{m.max}g
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.10)" }}>
                  <div className="h-1 rounded-full transition-[width]" style={{ width: `${pct}%`, backgroundColor: m.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Quick actions row */}
      <div className="mx-5 mt-4 grid grid-cols-4 gap-2">
        {quickAdds.map((q) => (
          <button
            key={q.label}
            onClick={q.onClick}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white py-3 transition-colors active:scale-95"
            style={{ border: CARD_BORDER }}
          >
            <span style={{ color: RED }}>{q.icon}</span>
            <span className="text-[10.5px] font-extrabold leading-none" style={{ color: DARK }}>{q.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Today's meals */}
      <section className="mx-5 mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[15px] font-black" style={{ color: DARK }}>Today's meals</h2>
          <button
            onClick={() => { setSummaryOpen(true); track("meals_summary_opened"); }}
            className="text-xs font-bold"
            style={{ color: RED }}
          >
            View all
          </button>
        </div>
        <div className="rounded-[20px] bg-white" style={{ border: CARD_BORDER }}>
          {MEALS.map((m, i) => {
            const items = mealMap.get(m) ?? [];
            const kcal = Math.round(items.reduce((a, b) => a + Number(b.calories), 0));
            const isOpen = expandedMeal === m;
            const yCount = yesterdayCountFor(m);
            return (
              <div key={m} style={{ borderTop: i === 0 ? "none" : CARD_BORDER }}>
                <button
                  onClick={() => { setActiveMeal(m); setExpandedMeal(isOpen ? null : m); track("meal_tab_switched", { meal: m }); }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                    style={{ backgroundColor: items.length === 0 ? "#f5efe7" : "rgba(224,48,48,0.10)" }}
                  >
                    {MEAL_EMOJI[m]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-extrabold leading-tight" style={{ color: DARK }}>{MEAL_LABELS[m]}</p>
                    {items.length === 0 ? (
                      <p className="text-[11px] font-semibold" style={{ color: "#d99898" }}>Not logged yet</p>
                    ) : (
                      <p className="text-[11px] font-semibold" style={{ color: MUTED }}>
                        {kcal} kcal · {items.length} {items.length === 1 ? "item" : "items"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMeal(m); setFoodOpen(true); track("add_food_opened", { source: "meal_row", meal: m }); }}
                    aria-label={`Add to ${MEAL_LABELS[m]}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-90"
                    style={{ backgroundColor: DARK }}
                  >
                    <Plus size={16} color="#fff" strokeWidth={3} />
                  </button>
                </button>

                {isOpen && items.length > 0 && (
                  <ul className="px-4 pb-3 pt-0">
                    {items.map((it) => (
                      <li key={it.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2" style={{ backgroundColor: "#faf8f5" }}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-extrabold" style={{ color: DARK }}>{it.food_name}</p>
                          <p className="truncate text-[10.5px] font-semibold" style={{ color: MUTED }}>
                            {it.serving} · {Math.round(it.calories)} kcal
                          </p>
                        </div>
                        <button onClick={() => setEditEntry(it)} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-md" style={{ border: CARD_BORDER }}>
                          <Pencil size={11} color={MUTED} />
                        </button>
                        <button onClick={() => { store.removeMeal(it.id); track("meal_removed", { food_name: it.food_name, meal_type: it.meal_type }); }} aria-label="Remove" className="flex h-7 w-7 items-center justify-center rounded-md" style={{ border: CARD_BORDER }}>
                          <Trash2 size={11} color={MUTED} />
                        </button>
                      </li>
                    ))}
                    {yCount > 0 && (
                      <button
                        onClick={() => { setCopyMeal(m); track("copy_yesterday_opened", { meal: m }); }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-extrabold"
                        style={{ backgroundColor: "#faf8f5", color: RED }}
                      >
                        <Copy size={11} /> Copy yesterday ({yCount})
                      </button>
                    )}
                  </ul>
                )}
                {isOpen && items.length === 0 && yCount > 0 && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => { setCopyMeal(m); track("copy_yesterday_opened", { meal: m }); }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-extrabold"
                      style={{ backgroundColor: "#faf8f5", color: RED }}
                    >
                      <Copy size={11} /> Copy yesterday ({yCount})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Stats strip */}
      <section className="mx-5 mt-4 grid grid-cols-3 gap-2">
        <WaterTile
          total={store.waterTotal}
          goal={store.goals.water_ml}
          onAdd={(ml) => { store.addWater(ml); track("water_logged", { ml, source: "tile" }); }}
          onOpen={() => { setWaterOpen(true); track("water_opened", { source: "stat_tile" }); }}
        />
        <ConsistencyTile
          breakfast={loggedMealTypes.has("breakfast")}
          lunch={loggedMealTypes.has("lunch")}
          dinner={loggedMealTypes.has("dinner")}
          water={store.goals.water_ml > 0 && store.waterTotal >= store.goals.water_ml}
          calories={
            store.goals.calories > 0 &&
            store.totals.calories >= store.goals.calories * 0.8 &&
            store.totals.calories <= store.goals.calories * 1.1
          }
        />
        <WeightTile
          weightLabel={
            latestWeight !== null
              ? `${displayWeight(latestWeight, weightUnit).toFixed(1)} ${weightUnit}`
              : "—"
          }
          deltaLabel={
            weightDeltaKg === null
              ? "log first"
              : `${weightDeltaKg <= 0 ? "▼" : "▲"} ${Math.abs(displayWeight(Math.abs(weightDeltaKg), weightUnit)).toFixed(1)}${weightUnit} 30d`
          }
          deltaColor={weightDeltaKg !== null && weightDeltaKg <= 0 ? "#22a06b" : weightDeltaKg !== null ? "#e03030" : MUTED}
          onClick={() => navigate({ to: "/weight" })}
        />
      </section>

      {/* Bottom nav */}
      <BottomNav
        active={activeTab}
        onChange={(t) => {
          setActiveTab(t);
          if (t === "trends") navigate({ to: "/weekly" });
          else if (t === "profile") navigate({ to: "/goals" });
          else if (t === "diary") navigate({ to: "/diary" });
        }}
        onAdd={() => { setQuickOpen(true); track("quick_log_opened"); }}
      />

      <QuickLogPanel
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onVoice={() => { setVoiceOpen(true); track("voice_log_opened", { source: "quick_panel" }); }}
        onScan={() => { setAiOpen(true); track("ai_scan_opened", { source: "quick_panel" }); }}
        onAddWater={(ml) => { store.addWater(ml); track("water_logged", { ml, source: "quick_panel" }); }}
        onLogWeight={() => navigate({ to: "/weight" })}
      />

      <MealsSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        mealMap={mealMap}
        onAddMeal={(m) => { setSummaryOpen(false); setActiveMeal(m); setFoodOpen(true); }}
        onTapChip={(it) => { setSummaryOpen(false); setEditEntry(it); }}
      />

      {/* Sheets / dialogs */}
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
        <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg" style={{ border: CARD_BORDER }}>
          <Loader2 size={14} className="animate-spin" color={RED} />
          <span className="text-xs font-extrabold" style={{ color: DARK }}>Updating your log…</span>
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

      <CopyYesterdaySheet
        open={copyMeal !== null}
        onClose={() => setCopyMeal(null)}
        meal={copyMeal ?? activeMeal}
        userId={user?.id}
        onCopy={async (items) => {
          if (items.length === 0) return;
          setSyncing(true);
          try {
            await store.addFoods(items.map((i) => ({ food: i.food, mealType: i.meal })));
          } finally {
            setTimeout(() => setSyncing(false), 1200);
          }
        }}
      />

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign back in to access your logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="flex-1 rounded-full py-2.5 text-sm font-extrabold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSignOut}
              className="flex-1 rounded-full py-2.5 text-sm font-extrabold text-white"
              style={{ backgroundColor: RED }}
            >
              <LogOut size={14} className="mr-1 inline" /> Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({
  label, value, sub, pct, color, icon, subColor, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  pct?: number;
  color?: string;
  icon?: React.ReactNode;
  subColor?: string;
  onClick?: () => void;
}) {
  const Inner = (
    <>
      <div className="flex items-center gap-1">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
      </div>
      <p className="mt-1 text-[16px] font-black leading-none" style={{ color: DARK }}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold" style={{ color: subColor ?? MUTED }}>{sub}</p>
      {typeof pct === "number" && (
        <div className="mt-2 h-1 w-full rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
          <div className="h-1 rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
        </div>
      )}
    </>
  );
  const cls = "rounded-[14px] bg-white p-3 text-left";
  const style = { border: CARD_BORDER };
  if (onClick) {
    return <button onClick={onClick} className={cls + " active:scale-95"} style={style}>{Inner}</button>;
  }
  return <div className={cls} style={style}>{Inner}</div>;
}

