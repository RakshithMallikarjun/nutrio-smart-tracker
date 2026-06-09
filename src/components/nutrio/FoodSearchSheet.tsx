import { useMemo, useState, useEffect } from "react";
import { X, Search, Plus, Minus } from "lucide-react";
import { MEAL_EMOJI, MEAL_LABELS, type Food, type MealType } from "@/lib/nutrio-data";
import { useDietPref } from "@/hooks/use-diet-pref";
import { isAllowed, parseQty, scaleFood, type DietPref } from "@/lib/quantity";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultMeal: MealType;
  onAdd: (food: Food, meal: MealType) => void;
};

const DIET_LABELS: Record<DietPref, string> = {
  any: "All",
  veg: "Veg",
  egg: "Eggetarian",
  nonveg: "Non-veg",
  vegan: "Vegan",
};

export function FoodSearchSheet({ open, onClose, defaultMeal, onAdd }: Props) {
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [cat, setCat] = useState<string>("All");
  const [foodDb, setFoodDb] = useState<Food[]>([]);
  const [foodCategories, setFoodCategories] = useState<string[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [diet, setDiet] = useDietPref();

  useEffect(() => {
    if (!open) return;
    setMeal(defaultMeal);
    import("@/lib/nutrio-data").then(({ FOOD_DB, FOOD_CATEGORIES }) => {
      setFoodDb(FOOD_DB);
      setFoodCategories(FOOD_CATEGORIES);
    });
  }, [open, defaultMeal]);

  // Smart quantity: extract leading qty from the query, search by the rest.
  const { qtyFromQuery, term } = useMemo(() => {
    const trimmed = q.trim();
    if (!trimmed) return { qtyFromQuery: 1, term: "" };
    const { qty, rest } = parseQty(trimmed);
    return { qtyFromQuery: qty, term: rest.toLowerCase() };
  }, [q]);

  const results = useMemo(() => {
    return foodDb.filter((f) => {
      if (cat !== "All" && f.category !== cat) return false;
      if (!isAllowed((f.diet ?? "veg") as any, diet)) return false;
      if (term && !f.name.toLowerCase().includes(term) && !f.category.toLowerCase().includes(term)) return false;
      return true;
    }).slice(0, 30);
  }, [term, cat, foodDb, diet]);

  const getQty = (id: string) => qty[id] ?? qtyFromQuery;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div className="animate-fade-in flex h-[88vh] w-full max-w-md flex-col rounded-t-[2.5rem] bg-white p-6 pb-32" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-charcoal">Add Food</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Meal selector */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
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

        {/* Diet pref */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {(Object.keys(DIET_LABELS) as DietPref[]).map((d) => {
            const active = d === diet;
            return (
              <button
                key={d}
                onClick={() => setDiet(d)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: active ? "#7a9990" : "#ffffff",
                  color: active ? "#ffffff" : "#171e19",
                  border: active ? "none" : "1px solid rgba(183,198,194,0.5)",
                }}
              >
                {DIET_LABELS[d]}
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
            placeholder='Try "2 idlis" or "masala dosa"'
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
          {results.map((f) => {
            const n = getQty(f.id);
            const set = (v: number) => setQty({ ...qty, [f.id]: Math.max(0.5, Math.round(v * 2) / 2) });
            return (
              <div key={f.id} className="flex items-center gap-2 rounded-2xl bg-white p-3 sage-border">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-extrabold text-charcoal">{f.name}</p>
                  <p className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ca0013" }}>{f.category}</p>
                  <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>
                    {f.serving} · {Math.round(f.calories * n)} kcal · P{Math.round(f.protein * n)} C{Math.round(f.carbs * n)} F{Math.round(f.fat * n)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => set(n - 0.5)} className="flex h-7 w-7 items-center justify-center rounded-full sage-border-soft" aria-label="Decrease">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-charcoal">{n}×</span>
                  <button onClick={() => set(n + 0.5)} className="flex h-7 w-7 items-center justify-center rounded-full sage-border-soft" aria-label="Increase">
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    onAdd(scaleFood(f, n), meal);
                    onClose();
                  }}
                  className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-vibrant hover:text-white"
                  style={{ border: "1px solid rgba(183,198,194,0.5)" }}
                  aria-label={`Add ${f.name}`}
                >
                  <Plus size={18} />
                </button>
              </div>
            );
          })}
          {results.length === 0 && (
            <p className="py-8 text-center text-sm font-bold" style={{ color: "#b7c6c2" }}>
              No foods found. Try another search.
            </p>
          )}
          {results.length === 30 && (
            <p className="py-4 text-center text-xs font-bold" style={{ color: "#b7c6c2" }}>
              Showing top 30 — refine your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
