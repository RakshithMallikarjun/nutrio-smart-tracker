import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goals — Nutrio" }] }),
  component: GoalsPage,
});

const FIELDS: { key: keyof Goals; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: "calories", label: "Calories", unit: "kcal", min: 800, max: 5000, step: 50 },
  { key: "protein", label: "Protein", unit: "g", min: 20, max: 400, step: 5 },
  { key: "carbs", label: "Carbohydrates", unit: "g", min: 20, max: 600, step: 5 },
  { key: "fat", label: "Fat", unit: "g", min: 10, max: 250, step: 5 },
  { key: "fiber", label: "Fiber", unit: "g", min: 5, max: 100, step: 1 },
  { key: "water_ml", label: "Water", unit: "ml", min: 500, max: 6000, step: 250 },
];

type Goals = {
  calories: number; protein: number; carbs: number; fat: number; fiber: number; water_ml: number;
};

type Mode = "loss" | "maintain" | "gain";

const PRESETS: Record<Mode, Goals> = {
  loss: { calories: 1800, protein: 150, carbs: 180, fat: 60, fiber: 30, water_ml: 2500 },
  maintain: { calories: 2200, protein: 140, carbs: 240, fat: 70, fiber: 30, water_ml: 2500 },
  gain: { calories: 2800, protein: 170, carbs: 320, fat: 85, fiber: 35, water_ml: 3000 },
};

function GoalsPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [goals, setGoals] = useState<Goals>(PRESETS.maintain);
  const [mode, setMode] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("goals").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setGoals({
          calories: data.calories, protein: data.protein, carbs: data.carbs,
          fat: data.fat, fiber: data.fiber, water_ml: data.water_ml,
        });
      }
      setLoading(false);
    });
  }, [user?.id]);

  const apply = (m: Mode) => {
    setMode(m);
    setGoals(PRESETS[m]);
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("goals").upsert({
      user_id: user.id, ...goals, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save goals");
      return;
    }
    toast.success("Goals saved");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-12" style={{ backgroundColor: "#eeebe3" }}>
      <header className="flex items-center justify-between px-5 pt-12">
        <Link
          to="/dashboard"
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-black text-charcoal">Goals</h1>
        <div className="h-11 w-11" />
      </header>

      <p className="mx-5 mt-2 text-sm font-bold" style={{ color: "#b7c6c2" }}>
        Daily nutrition targets. Pick a preset or fine-tune below.
      </p>

      {/* Mode presets */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-2">
        {(["loss", "maintain", "gain"] as Mode[]).map((m) => {
          const active = mode === m;
          const labels: Record<Mode, string> = { loss: "Lose", maintain: "Maintain", gain: "Gain" };
          return (
            <button
              key={m}
              onClick={() => apply(m)}
              className="rounded-2xl py-3 text-sm font-extrabold transition-colors"
              style={{
                backgroundColor: active ? "#171e19" : "#ffffff",
                color: active ? "#ffffff" : "#171e19",
                border: active ? "none" : "1px solid rgba(183,198,194,0.5)",
              }}
            >
              {labels[m]}
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="mx-5 mt-5 space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="rounded-2xl bg-white p-4 sage-border">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label" style={{ color: "#b7c6c2" }}>{f.label}</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={goals[f.key]}
                  onChange={(e) => setGoals({ ...goals, [f.key]: Number(e.target.value) || 0 })}
                  className="w-20 rounded-lg bg-cream px-2 py-1 text-right text-base font-black text-charcoal outline-none sage-border-soft"
                />
                <span className="text-xs font-bold" style={{ color: "#b7c6c2" }}>{f.unit}</span>
              </div>
            </div>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={goals[f.key]}
              onChange={(e) => setGoals({ ...goals, [f.key]: Number(e.target.value) })}
              className="w-full accent-[#ca0013]"
            />
            <div className="mt-1 flex justify-between text-[10px] font-bold" style={{ color: "#b7c6c2" }}>
              <span>{f.min}</span>
              <span>{f.max}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving || loading}
        className="mx-5 mt-6 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold text-white transition-colors disabled:opacity-60"
        style={{ backgroundColor: "#ca0013" }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save goals
      </button>
    </div>
  );
}
