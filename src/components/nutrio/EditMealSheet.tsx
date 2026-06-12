import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import type { MealRow } from "@/hooks/use-nutrio-cloud";
import { track } from "@/lib/analytics";

type Patch = Partial<Pick<MealRow, "serving" | "calories" | "protein" | "carbs" | "fat" | "fiber">>;

type Props = {
  entry: MealRow | null;
  onClose: () => void;
  onSave: (id: string, patch: Patch) => void;
};

const FIELDS: { key: keyof Patch; label: string; suffix?: string }[] = [
  { key: "calories", label: "Calories", suffix: "kcal" },
  { key: "protein", label: "Protein", suffix: "g" },
  { key: "carbs", label: "Carbs", suffix: "g" },
  { key: "fat", label: "Fat", suffix: "g" },
  { key: "fiber", label: "Fiber", suffix: "g" },
];

export function EditMealSheet({ entry, onClose, onSave }: Props) {
  const [serving, setServing] = useState("");
  const [nums, setNums] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!entry) return;
    setServing(entry.serving);
    setNums({
      calories: Number(entry.calories),
      protein: Number(entry.protein),
      carbs: Number(entry.carbs),
      fat: Number(entry.fat),
      fiber: Number(entry.fiber),
    });
  }, [entry]);

  if (!entry) return null;

  const save = () => {
    onSave(entry.id, {
      serving: serving.trim() || entry.serving,
      calories: Math.max(0, nums.calories ?? 0),
      protein: Math.max(0, nums.protein ?? 0),
      carbs: Math.max(0, nums.carbs ?? 0),
      fat: Math.max(0, nums.fat ?? 0),
      fiber: Math.max(0, nums.fiber ?? 0),
    });
    track("meal_edited", { food_name: entry.food_name });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div className="animate-fade-in flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 pb-32" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-label" style={{ color: "#b7c6c2" }}>Edit entry</p>
            <h2 className="truncate text-xl font-black text-charcoal">{entry.food_name}</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-label" style={{ color: "#b7c6c2" }}>Serving</span>
          <input
            value={serving}
            onChange={(e) => setServing(e.target.value)}
            className="w-full rounded-2xl bg-cream px-4 py-3 text-sm font-bold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <label key={f.key as string} className="rounded-2xl bg-cream p-3 sage-border-soft">
              <span className="mb-1 block text-label" style={{ color: "#b7c6c2" }}>{f.label}</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={Number.isFinite(nums[f.key as string]) ? nums[f.key as string] : 0}
                  onChange={(e) => setNums({ ...nums, [f.key as string]: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-lg font-black text-charcoal outline-none"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>{f.suffix}</span>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={save}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black text-white"
          style={{ backgroundColor: "#ca0013" }}
        >
          <Check size={18} /> Save changes
        </button>
      </div>
    </div>
  );
}
