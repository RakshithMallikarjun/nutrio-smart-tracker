import { useMemo, useState, useEffect } from "react";
import { X, Search, Plus, Minus, Sparkles, Trash2, Loader2, BookmarkPlus, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { MEAL_EMOJI, MEAL_LABELS, type Food, type MealType } from "@/lib/nutrio-data";
import { useDietPref } from "@/hooks/use-diet-pref";
import { useCustomFoods } from "@/hooks/use-custom-foods";
import { isAllowed, parseQty, scaleFood, type DietPref } from "@/lib/quantity";
import { estimateFood } from "@/lib/ai-food.functions";
import { track } from "@/lib/analytics";
import { toast } from "sonner";


type Props = {
  open: boolean;
  onClose: () => void;
  defaultMeal: MealType;
  onAdd: (food: Food, meal: MealType) => void;
  onVoice?: () => void;
  userId?: string;
};

const DIET_LABELS: Record<DietPref, string> = {
  any: "All",
  veg: "Veg",
  egg: "Eggetarian",
  nonveg: "Non-veg",
  vegan: "Vegan",
};

export function FoodSearchSheet({ open, onClose, defaultMeal, onAdd, onVoice, userId }: Props) {
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [cat, setCat] = useState<string>("All");
  const [foodDb, setFoodDb] = useState<Food[]>([]);
  const [foodCategories, setFoodCategories] = useState<string[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [diet, setDiet] = useDietPref();
  const { customFoods, deleteCustomFood } = useCustomFoods(userId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (food: Food) => {
    if (!food.id || deletingId) return;
    setDeletingId(food.id);
    try {
      await deleteCustomFood(food.id);
      toast.success(`"${food.name}" removed from My Foods`);
      if (cat === "My Foods" && results.length <= 1) setCat("All");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeletingId(null);
    }
  };


  useEffect(() => {
    if (!open) return;
    setMeal(defaultMeal);
    import("@/lib/nutrio-data").then(({ FOOD_DB, FOOD_CATEGORIES }) => {
      setFoodDb(FOOD_DB);
      setFoodCategories(FOOD_CATEGORIES);
    });
  }, [open, defaultMeal]);

  // Merged index: custom foods first so they win on duplicate names.
  const merged = useMemo<Food[]>(() => [...customFoods, ...foodDb], [customFoods, foodDb]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    if (customFoods.length) set.add("My Foods");
    foodCategories.forEach((c) => set.add(c));
    return Array.from(set);
  }, [customFoods, foodCategories]);

  const { qtyFromQuery, term } = useMemo(() => {
    const trimmed = q.trim();
    if (!trimmed) return { qtyFromQuery: 1, term: "" };
    const { qty, rest } = parseQty(trimmed);
    return { qtyFromQuery: qty, term: rest.toLowerCase() };
  }, [q]);

  const results = useMemo(() => {
    return merged.filter((f) => {
      if (cat !== "All" && f.category !== cat) return false;
      if (!isAllowed((f.diet ?? "veg") as any, diet)) return false;
      if (term && !f.name.toLowerCase().includes(term) && !f.category.toLowerCase().includes(term)) return false;
      return true;
    }).slice(0, 30);
  }, [term, cat, merged, diet]);

  useEffect(() => {
    if (term.length < 2) return;
    const t = setTimeout(() => track("food_searched", { term, category: cat }), 600);
    return () => clearTimeout(t);
  }, [term, cat]);

  const getQty = (id: string) => qty[id] ?? qtyFromQuery;

  if (!open) return null;

  const meals = Object.keys(MEAL_LABELS) as MealType[];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div className="animate-fade-in flex h-[88vh] w-full max-w-md flex-col rounded-t-[2.5rem] bg-white p-6 pb-32" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-charcoal">Add Food</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Compact meal selector — active expands, others 40px emoji-only */}
        <div className="mb-3 flex gap-2">
          {meals.map((m) => {
            const active = m === meal;
            if (active) {
              return (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-extrabold"
                  style={{ backgroundColor: "#171e19", color: "#ffffff" }}
                >
                  <span>{MEAL_EMOJI[m]}</span>
                  <span className="truncate">{MEAL_LABELS[m]}</span>
                </button>
              );
            }
            return (
              <button
                key={m}
                onClick={() => setMeal(m)}
                aria-label={MEAL_LABELS[m]}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
                style={{ backgroundColor: "#ffffff", border: "1px solid rgba(183,198,194,0.5)" }}
              >
                {MEAL_EMOJI[m]}
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

        {/* Search input with clear + mic */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" color="#b7c6c2" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Try "2 idlis" or "pizza"'
            className="w-full rounded-2xl bg-cream py-3 pl-11 pr-20 text-base font-semibold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white"
              >
                <X size={14} color="#b7c6c2" />
              </button>
            )}
            {onVoice && (
              <button
                onClick={onVoice}
                aria-label="Voice search"
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "#ca0013" }}
              >
                <Mic size={14} color="#ffffff" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {["All", ...categories].map((c) => {
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
              <div key={f.id} className="group relative flex items-center gap-2 rounded-2xl bg-white p-3 sage-border">
                {f.category === "My Foods" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(f); }}
                    disabled={deletingId === f.id}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    style={{ backgroundColor: "rgba(202,0,19,0.1)" }}
                    aria-label={`Delete ${f.name}`}
                  >
                    {deletingId === f.id
                      ? <Loader2 size={12} className="animate-spin" color="#ca0013" />
                      : <Trash2 size={12} color="#ca0013" />}
                  </button>
                )}

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
                    const scaled = scaleFood(f, n);
                    onAdd(scaled, meal);
                    track("food_added", {
                      food_name: f.name,
                      category: f.category,
                      meal,
                      quantity: n,
                      calories: Math.round(f.calories * n),
                    });
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
