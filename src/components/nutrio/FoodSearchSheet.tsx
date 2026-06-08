import { useMemo, useState, useEffect } from "react";
import { X, Search, Plus } from "lucide-react";
import { MEAL_EMOJI, MEAL_LABELS, type Food, type MealType } from "@/lib/nutrio-data";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (food: Food, meal: MealType) => void;
};

export function FoodSearchSheet({ open, onClose, onAdd }: Props) {
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [cat, setCat] = useState<string>("All");
  const [foodDb, setFoodDb] = useState<Food[]>([]);
  const [foodCategories, setFoodCategories] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    import("@/lib/nutrio-data").then(({ FOOD_DB, FOOD_CATEGORIES }) => {
      setFoodDb(FOOD_DB);
      setFoodCategories(FOOD_CATEGORIES);
    });
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return foodDb.filter((f) => {
      if (cat !== "All" && f.category !== cat) return false;
      if (term && !f.name.toLowerCase().includes(term) && !f.category.toLowerCase().includes(term)) return false;
      return true;
    }).slice(0, 30);
  }, [q, cat, foodDb]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div
        className="animate-fade-in flex h-[88vh] w-full max-w-md flex-col rounded-t-[2.5rem] bg-white p-6 pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-charcoal">Add Food</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full sage-border"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Meal selector */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => {
            const active = m === meal;
            return (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition-colors"
                style={{
                  backgroundColor: active ? "#171e19" : "#ffffff",
                  color: active ? "#ffffff" : "#171e19",
                  border: active ? "none" : "1px solid rgba(183,198,194,0.5)",
                }}
              >
                <span>{MEAL_EMOJI[m]}</span>
                {MEAL_LABELS[m]}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" color="#b7c6c2" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 200+ Indian foods…"
            className="w-full rounded-2xl bg-cream py-3 pl-11 pr-4 text-base font-semibold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
          />
        </div>

        {/* Category chips */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {["All", ...foodCategories].map((c) => {
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: active ? "#ca0013" : "#ffffff",
                  color: active ? "#ffffff" : "#171e19",
                  border: active ? "none" : "1px solid rgba(183,198,194,0.5)",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>


        {/* Results */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {results.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-2xl bg-white p-3 sage-border"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold text-charcoal">{f.name}</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ca0013" }}>
                  {f.category}
                </p>
                <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>
                  {f.serving} · {f.calories} kcal · P{f.protein} C{f.carbs} F{f.fat}
                </p>
              </div>
              <button
                onClick={() => {
                  onAdd(f, meal);
                  onClose();
                }}
                className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-vibrant hover:text-white"
                style={{ border: "1px solid rgba(183,198,194,0.5)" }}
                aria-label={`Add ${f.name}`}
              >
                <Plus size={18} />
              </button>
            </div>
          ))}
          {results.length === 0 && (
            <p className="py-8 text-center text-sm font-bold" style={{ color: "#b7c6c2" }}>
              No foods found. Try another search.
            </p>
          )}
          {results.length === 30 && (
            <p className="py-4 text-center text-xs font-bold" style={{ color: "#b7c6c2" }}>
              Showing top 30 — type more to narrow down.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
