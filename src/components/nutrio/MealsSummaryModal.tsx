import { X, Plus } from "lucide-react";
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from "@/lib/nutrio-data";
import type { MealRow } from "@/hooks/use-nutrio-cloud";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

type Props = {
  open: boolean;
  onClose: () => void;
  mealMap: Map<MealType, MealRow[]>;
  onAddMeal: (m: MealType) => void;
  onTapChip: (entry: MealRow) => void;
};

export function MealsSummaryModal({ open, onClose, mealMap, onAddMeal, onTapChip }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in w-full max-w-md rounded-t-3xl bg-white p-4 sm:rounded-3xl"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black" style={{ color: "#1a1a1a" }}>Today's meals</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "#f5f2ee" }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-2.5">
          {MEALS.map((m) => {
            const items = mealMap.get(m) ?? [];
            const kcal = Math.round(items.reduce((a, b) => a + Number(b.calories), 0));
            return (
              <div
                key={m}
                className="rounded-2xl p-3"
                style={{ backgroundColor: "#faf8f5", border: "0.5px solid #e8e4df" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{MEAL_EMOJI[m]}</span>
                    <span className="text-[13px] font-extrabold" style={{ color: "#1a1a1a" }}>
                      {MEAL_LABELS[m]}
                    </span>
                  </div>
                  <span className="text-[12px] font-extrabold" style={{ color: "#1a1a1a" }}>
                    {kcal} kcal
                  </span>
                </div>
                {items.length === 0 ? (
                  <button
                    onClick={() => onAddMeal(m)}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold"
                    style={{ color: "#8a8580" }}
                  >
                    <Plus size={11} /> Tap + to log {MEAL_LABELS[m].toLowerCase()}
                  </button>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => onTapChip(it)}
                        className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-bold"
                        style={{ border: "0.5px solid #e8e4df", color: "#1a1a1a" }}
                      >
                        {it.food_name} · {Math.round(it.calories)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
