import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Loader2, Calculator, ChevronDown, ChevronUp, Bell, BellOff } from "lucide-react";
import {
  getRemindersEnabled,
  requestAndEnableReminders,
  disableReminders,
} from "@/lib/notifications";

import { supabase } from "@/integrations/supabase/client";
import { useDietPref } from "@/hooks/use-diet-pref";
import type { DietPref } from "@/lib/quantity";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goals — Nutrio" }] }),
  component: GoalsPage,
});

type Goals = { calories: number; protein: number; carbs: number; fat: number; fiber: number; water_ml: number };
type Gender = "male" | "female";
type Activity = "sedentary" | "light" | "moderate" | "very";
type GoalType = "loss" | "maintain" | "gain";

const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725,
};
const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Sedentary", light: "Lightly Active", moderate: "Moderately Active", very: "Very Active",
};
const GOAL_LABEL: Record<GoalType, string> = { loss: "Lose", maintain: "Maintain", gain: "Gain" };

function mifflin({ age, gender, weight_kg, height_cm }: { age: number; gender: Gender; weight_kg: number; height_cm: number }): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

function autoCalcGoals(p: { age: number; gender: Gender; weight_kg: number; height_cm: number; activity: Activity; goal: GoalType }): Goals {
  const bmr = mifflin(p);
  const tdee = bmr * ACTIVITY_MULT[p.activity];
  const adj = p.goal === "loss" ? -500 : p.goal === "gain" ? 350 : 0;
  const calories = Math.round((tdee + adj) / 10) * 10;
  const protein = Math.round(p.weight_kg * (p.goal === "loss" ? 2.0 : p.goal === "gain" ? 1.8 : 1.6));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((calories / 1000) * 14);
  const water_ml = Math.round((p.weight_kg * 35) / 100) * 100;
  return { calories, protein, carbs, fat, fiber, water_ml };
}

const FIELDS: { key: keyof Goals; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: "calories", label: "Calories", unit: "kcal", min: 800, max: 5000, step: 50 },
  { key: "protein", label: "Protein", unit: "g", min: 20, max: 400, step: 5 },
  { key: "carbs", label: "Carbohydrates", unit: "g", min: 20, max: 600, step: 5 },
  { key: "fat", label: "Fat", unit: "g", min: 10, max: 250, step: 5 },
  { key: "fiber", label: "Fiber", unit: "g", min: 5, max: 100, step: 1 },
  { key: "water_ml", label: "Water", unit: "ml", min: 500, max: 6000, step: 250 },
];

function GoalsPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [goals, setGoals] = useState<Goals>({ calories: 2200, protein: 140, carbs: 240, fat: 70, fiber: 30, water_ml: 2500 });
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState<Gender>("male");
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goalType, setGoalType] = useState<GoalType>("maintain");
  const [diet, setDiet] = useDietPref();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);
  const [requestingPerm, setRequestingPerm] = useState(false);

  useEffect(() => {
    setRemindersOn(getRemindersEnabled());
  }, []);

  // Sync with persisted profile preference on load
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("notifications_enabled")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRemindersOn(!!data.notifications_enabled && getRemindersEnabled());
      });
  }, [user?.id]);

  const persistReminderPref = async (enabled: boolean) => {
    if (!user?.id) return;
    await supabase.from("profiles").upsert({
      id: user.id,
      notifications_enabled: enabled,
      notifications_prompt_completed: true,
      notification_consent_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const toggleReminders = async () => {
    if (remindersOn) {
      disableReminders();
      setRemindersOn(false);
      await persistReminderPref(false);
      track("reminders_toggled", { enabled: false });
      toast.success("✓ Meal reminders disabled");
    } else {
      setRequestingPerm(true);
      const granted = await requestAndEnableReminders();
      setRequestingPerm(false);
      if (granted) {
        setRemindersOn(true);
        await persistReminderPref(true);
        track("reminders_toggled", { enabled: true });
        toast.success("✓ Meal reminders enabled");
      } else {
        toast.error("Notification permission denied. Enable it in your browser/device settings.");
      }
    }
  };



  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from("goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]).then(([g, p]) => {
      if (g.data) setGoals({
        calories: g.data.calories, protein: g.data.protein, carbs: g.data.carbs,
        fat: g.data.fat, fiber: g.data.fiber, water_ml: g.data.water_ml,
      });
      if (p.data) {
        if (p.data.age) setAge(p.data.age);
        if (p.data.gender === "male" || p.data.gender === "female") setGender(p.data.gender);
        if (p.data.weight_kg) setWeight(Number(p.data.weight_kg));
        if (p.data.height_cm) setHeight(Number(p.data.height_cm));
        if (p.data.activity_level && p.data.activity_level in ACTIVITY_MULT) setActivity(p.data.activity_level as Activity);
        if (p.data.goal_type && (p.data.goal_type === "loss" || p.data.goal_type === "maintain" || p.data.goal_type === "gain")) setGoalType(p.data.goal_type as GoalType);
      }
      setLoading(false);
    });
  }, [user?.id]);

  const calculated = useMemo(() => autoCalcGoals({ age, gender, weight_kg: weight, height_cm: height, activity, goal: goalType }), [age, gender, weight, height, activity, goalType]);

  const applyAuto = () => {
    setGoals(calculated);
    track("goals_auto_calculated", { goal_type: goalType, calories: calculated.calories });
    toast.success("Goals auto-calculated");
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const [g, p] = await Promise.all([
      supabase.from("goals").upsert({ user_id: user.id, ...goals, updated_at: new Date().toISOString() }),
      supabase.from("profiles").upsert({
        id: user.id, age, gender, weight_kg: weight, height_cm: height,
        activity_level: activity, goal_type: goalType, updated_at: new Date().toISOString(),
      }),
    ]);
    setSaving(false);
    if (g.error || p.error) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Saved");
    track("goals_saved", {
      goal_type: goalType,
      calories: goals.calories,
      protein: goals.protein,
      activity,
    });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-12" style={{ backgroundColor: "#eeebe3" }}>
      <header className="flex items-center justify-between px-5 pt-12">
        <Link to="/dashboard" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-black text-charcoal">Your Goals</h1>
        <div className="h-11 w-11" />
      </header>

      <p className="mx-5 mt-2 text-sm font-bold" style={{ color: "#b7c6c2" }}>
        Auto-calculate from your profile, or fine-tune below.
      </p>

      {/* Profile inputs */}
      <section className="mx-5 mt-4 space-y-3 rounded-2xl bg-white p-4 sage-border">
        <p className="text-label" style={{ color: "#b7c6c2" }}>About you</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Age (yrs)" value={age} onChange={setAge} />
          <Field label="Weight (kg)" value={weight} onChange={setWeight} />
          <Field label="Height (cm)" value={height} onChange={setHeight} />
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Gender</p>
            <div className="grid grid-cols-2 gap-1">
              {(["male", "female"] as Gender[]).map((g) => (
                <button key={g} onClick={() => setGender(g)} className="rounded-lg py-2 text-xs font-extrabold capitalize" style={{ backgroundColor: gender === g ? "#171e19" : "#fffdf6", color: gender === g ? "#fff" : "#171e19", border: gender === g ? "none" : "1px solid rgba(183,198,194,0.5)" }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Activity</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(ACTIVITY_MULT) as Activity[]).map((a) => (
              <button key={a} onClick={() => setActivity(a)} className="rounded-lg py-2 text-[11px] font-extrabold" style={{ backgroundColor: activity === a ? "#171e19" : "#fffdf6", color: activity === a ? "#fff" : "#171e19", border: activity === a ? "none" : "1px solid rgba(183,198,194,0.5)" }}>
                {ACTIVITY_LABEL[a]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Goal</p>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(GOAL_LABEL) as GoalType[]).map((g) => (
              <button key={g} onClick={() => setGoalType(g)} className="rounded-lg py-2 text-xs font-extrabold" style={{ backgroundColor: goalType === g ? "#ca0013" : "#fffdf6", color: goalType === g ? "#fff" : "#171e19", border: goalType === g ? "none" : "1px solid rgba(183,198,194,0.5)" }}>
                {GOAL_LABEL[g]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Diet preference</p>
          <div className="grid grid-cols-5 gap-1">
            {(["any", "veg", "egg", "nonveg", "vegan"] as DietPref[]).map((d) => (
              <button key={d} onClick={() => setDiet(d)} className="rounded-lg py-2 text-[10px] font-extrabold uppercase" style={{ backgroundColor: diet === d ? "#7a9990" : "#fffdf6", color: diet === d ? "#fff" : "#171e19", border: diet === d ? "none" : "1px solid rgba(183,198,194,0.5)" }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-cream p-3">
          <div className="text-xs font-bold text-charcoal">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Suggested</p>
            <p>{calculated.calories} kcal · P{calculated.protein} C{calculated.carbs} F{calculated.fat}</p>
          </div>
          <button onClick={applyAuto} className="flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-extrabold text-white" style={{ backgroundColor: "#ca0013" }}>
            <Calculator size={12} /> Apply
          </button>
        </div>
      </section>

      {/* Manual macros toggle */}
      <div className="mx-5 mt-4">
        <button
          onClick={() => setShowMacros((s) => !s)}
          className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left sage-border"
        >
          <span className="text-sm font-extrabold text-charcoal">Set macros manually</span>
          {showMacros ? <ChevronUp size={18} color="#171e19" /> : <ChevronDown size={18} color="#171e19" />}
        </button>
      </div>

      {/* Sliders */}
      {showMacros && (
        <div className="mx-5 mt-3 space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="rounded-2xl bg-white p-4 sage-border">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-label" style={{ color: "#b7c6c2" }}>{f.label}</span>
                <div className="flex items-baseline gap-1">
                  <input type="number" inputMode="numeric" min={f.min} max={f.max} step={f.step} value={goals[f.key]} onChange={(e) => setGoals({ ...goals, [f.key]: Number(e.target.value) || 0 })} className="w-20 rounded-lg bg-cream px-2 py-1 text-right text-base font-black text-charcoal outline-none sage-border-soft" />
                  <span className="text-xs font-bold" style={{ color: "#b7c6c2" }}>{f.unit}</span>
                </div>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={goals[f.key]} onChange={(e) => setGoals({ ...goals, [f.key]: Number(e.target.value) })} className="w-full accent-[#ca0013]" />
            </div>
          ))}
        </div>
      )}

      {/* Meal Reminders */}
      <section className="mx-5 mt-4 rounded-2xl bg-white p-4 sage-border">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: remindersOn ? "rgba(202,0,19,0.1)" : "rgba(183,198,194,0.3)" }}>
            {remindersOn
              ? <Bell size={18} color="#ca0013" />
              : <BellOff size={18} color="#b7c6c2" />
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-charcoal">Meal reminders</p>
            <p className="text-[11px] font-bold" style={{ color: "#b7c6c2" }}>
              {remindersOn ? "On · 8am, 1pm, 4pm, 7:30pm" : "Remind me to log meals"}
            </p>
          </div>
          <button
            onClick={toggleReminders}
            disabled={requestingPerm}
            className="rounded-full px-4 py-2 text-xs font-extrabold disabled:opacity-60"
            style={{
              backgroundColor: remindersOn ? "#171e19" : "#ca0013",
              color: "#ffffff",
            }}
          >
            {requestingPerm ? "…" : remindersOn ? "Turn off" : "Enable"}
          </button>
        </div>
      </section>



      <button onClick={save} disabled={saving || loading} className="mx-5 mt-6 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold text-white disabled:opacity-60" style={{ backgroundColor: "#ca0013" }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save goals
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>{label}</p>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg bg-cream px-3 py-2 text-base font-black text-charcoal outline-none sage-border-soft"
      />
    </div>
  );
}
