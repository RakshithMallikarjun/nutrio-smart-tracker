import { useMemo, useState, useEffect } from "react";
import { X, Search, Plus, Minus, Sparkles, Trash2, Loader2, BookmarkPlus, Clock, BookOpen, Folder } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { MEAL_EMOJI, MEAL_LABELS, type Food, type MealType } from "@/lib/nutrio-data";
import { useDietPref } from "@/hooks/use-diet-pref";
import { useCustomFoods } from "@/hooks/use-custom-foods";
import { useRecentFoods } from "@/hooks/use-recent-foods";
import { isAllowed, parseQty, scaleFood, type DietPref } from "@/lib/quantity";
import { estimateFood } from "@/lib/ai-food.functions";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultMeal: MealType;
  onAdd: (food: Food, meal: MealType) => void;
  userId?: string;
};

type TabKey = "recent" | "my" | "all";

const DIET_LABELS: Record<DietPref, string> = {
  any: "All", veg: "Veg", egg: "Eggetarian", nonveg: "Non-veg", vegan: "Vegan",
};

export function FoodSearchSheet({ open, onClose, defaultMeal, onAdd, userId }: Props) {
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [tab, setTab] = useState<TabKey>("recent");
  const [foodDb, setFoodDb] = useState<Food[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [diet, setDiet] = useDietPref();
  const { customFoods, deleteCustomFood, addCustomFood } = useCustomFoods(userId);
  const { recent } = useRecentFoods(userId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Food | null>(null);

  const estimateFn = useServerFn(estimateFood);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<Food | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMeal(defaultMeal);
    setTab(recent.length > 0 ? "recent" : "all");
    import("@/lib/nutrio-data").then(({ FOOD_DB }) => setFoodDb(FOOD_DB));
  }, [open, defaultMeal]); // eslint-disable-line react-hooks/exhaustive-deps

  const term = q.trim().toLowerCase();
  const { qtyFromQuery, searchTerm } = useMemo(() => {
    if (!term) return { qtyFromQuery: 1, searchTerm: "" };
    const { qty, rest } = parseQty(term);
    return { qtyFromQuery: qty, searchTerm: rest.toLowerCase() };
  }, [term]);

  const filterBy = (list: Food[]) =>
    list.filter((f) => {
      if (!isAllowed((f.diet ?? "veg") as any, diet)) return false;
      if (!searchTerm) return true;
      return (
        f.name.toLowerCase().includes(searchTerm) ||
        (f.category ?? "").toLowerCase().includes(searchTerm)
      );
    });

  const results = useMemo(() => {
    if (tab === "recent") return filterBy(recent);
    if (tab === "my") return filterBy(customFoods);
    return filterBy(customFoods.concat(foodDb)).slice(0, 50);
  }, [tab, recent, customFoods, foodDb, diet, searchTerm]);

  useEffect(() => {
    if (searchTerm.length < 2) return;
    const t = setTimeout(() => track("food_searched", { term: searchTerm, tab }), 600);
    return () => clearTimeout(t);
  }, [searchTerm, tab]);

  const getQty = (id: string) => qty[id] ?? qtyFromQuery;

  const runAiAnalyze = async () => {
    const tt = q.trim();
    if (!tt) { toast.error("Type a food name first"); return; }
    setAiLoading(true);
    setAiPreview(null);
    try {
      const r = await estimateFn({ data: { name: tt } });
      setAiPreview({
        id: `ai-${Date.now()}`, name: r.name, category: "AI Estimate",
        serving: r.serving, calories: r.calories, protein: r.protein,
        carbs: r.carbs, fat: r.fat, fiber: r.fiber,
      });
      track("food_ai_analyzed", { term: tt });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze");
    } finally { setAiLoading(false); }
  };

  const aiAddToLog = () => {
    if (!aiPreview) return;
    onAdd(aiPreview, meal);
    toast.success(`✓ Added to ${MEAL_LABELS[meal]}`);
    track("food_added", { food_name: aiPreview.name, category: "AI Estimate", meal, quantity: 1, calories: aiPreview.calories });
    setAiPreview(null); setQ(""); onClose();
  };

  const aiSaveToMyFoods = async () => {
    if (!aiPreview || !userId) return;
    const dup = customFoods.find((f) => f.name.trim().toLowerCase() === aiPreview.name.trim().toLowerCase());
    if (dup) { toast.info("Already saved in My Foods"); return; }
    setAiSaving(true);
    try {
      await addCustomFood({
        name: aiPreview.name, category: "My Foods", serving: aiPreview.serving,
        calories: aiPreview.calories, protein: aiPreview.protein, carbs: aiPreview.carbs,
        fat: aiPreview.fat, fiber: aiPreview.fiber,
      });
      toast.success("✓ Saved to My Foods");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setAiSaving(false); }
  };

  const doDelete = async () => {
    if (!confirmDelete?.id) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteCustomFood(confirmDelete.id);
      toast.success(`"${confirmDelete.name}" removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally { setDeletingId(null); setConfirmDelete(null); }
  };

  if (!open) return null;
  const meals = Object.keys(MEAL_LABELS) as MealType[];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div className="animate-fade-in flex h-[90vh] w-full max-w-md flex-col rounded-t-[2.5rem] bg-white p-6 pb-32" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-charcoal">Add Food</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Meal selector */}
        <div className="mb-3 flex gap-2">
          {meals.map((m) => {
            const active = m === meal;
            return active ? (
              <button key={m} onClick={() => setMeal(m)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-extrabold" style={{ backgroundColor: "#171e19", color: "#ffffff" }}>
                <span>{MEAL_EMOJI[m]}</span><span className="truncate">{MEAL_LABELS[m]}</span>
              </button>
            ) : (
              <button key={m} onClick={() => setMeal(m)} aria-label={MEAL_LABELS[m]} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(183,198,194,0.5)" }}>
                {MEAL_EMOJI[m]}
              </button>
            );
          })}
        </div>

        {/* Tabs: Recent | My Foods | All Foods */}
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-cream p-1 sage-border-soft">
          {([
            { k: "recent" as const, label: "Recent", Icon: Clock },
            { k: "my" as const, label: "My Foods", Icon: Folder },
            { k: "all" as const, label: "All Foods", Icon: BookOpen },
          ]).map(({ k, label, Icon }) => {
            const active = k === tab;
            return (
              <button key={k} onClick={() => setTab(k)} className="flex items-center justify-center gap-1 rounded-full py-2 text-[11px] font-extrabold" style={{ backgroundColor: active ? "#171e19" : "transparent", color: active ? "#fff" : "#171e19" }}>
                <Icon size={12} /> {label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" color="#b7c6c2" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder='Search name or brand…'
            className="w-full rounded-2xl bg-cream py-3 pl-11 pr-24 text-base font-semibold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white">
                <X size={14} color="#b7c6c2" />
              </button>
            )}
            <button onClick={runAiAnalyze} disabled={aiLoading || !q.trim()} aria-label="Analyze with AI" className="flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-extrabold text-white disabled:opacity-50" style={{ backgroundColor: "#ca0013" }}>
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI
            </button>
          </div>
        </div>

        {/* Diet preference (only on All Foods) */}
        {tab === "all" && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {(Object.keys(DIET_LABELS) as DietPref[]).map((d) => {
              const active = d === diet;
              return (
                <button key={d} onClick={() => setDiet(d)} className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: active ? "#7a9990" : "#ffffff", color: active ? "#fff" : "#171e19", border: active ? "none" : "1px solid rgba(183,198,194,0.5)" }}>
                  {DIET_LABELS[d]}
                </button>
              );
            })}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {results.map((f) => {
            const n = getQty(f.id);
            const set = (v: number) => setQty({ ...qty, [f.id]: Math.max(0.5, Math.round(v * 2) / 2) });
            const isMyFood = tab === "my" || f.category === "My Foods";
            return (
              <div key={f.id} className="flex flex-col gap-2 rounded-2xl bg-white p-3 sage-border">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold text-charcoal">{f.name}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ca0013" }}>{f.category}</p>
                    <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>
                      {f.serving} · {Math.round(f.calories * n)} kcal · P{Math.round(f.protein * n)} C{Math.round(f.carbs * n)} F{Math.round(f.fat * n)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => set(n - 0.5)} className="flex h-7 w-7 items-center justify-center rounded-full sage-border-soft" aria-label="Decrease"><Minus size={12} /></button>
                    <span className="w-6 text-center text-xs font-black text-charcoal">{n}×</span>
                    <button onClick={() => set(n + 0.5)} className="flex h-7 w-7 items-center justify-center rounded-full sage-border-soft" aria-label="Increase"><Plus size={12} /></button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const scaled = scaleFood(f, n);
                      onAdd(scaled, meal);
                      track("food_added", { food_name: f.name, category: f.category, meal, quantity: n, calories: Math.round(f.calories * n) });
                      onClose();
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold text-white transition-colors"
                    style={{ backgroundColor: "#ca0013" }}
                  >
                    <Plus size={14} /> Add
                  </button>
                  {isMyFood && f.id && (
                    <button
                      onClick={() => setConfirmDelete(f)}
                      disabled={deletingId === f.id}
                      className="flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold disabled:opacity-50"
                      style={{ border: "1.5px solid #ca0013", color: "#ca0013" }}
                      aria-label={`Delete ${f.name}`}
                    >
                      {deletingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {aiPreview && (
            <div className="rounded-2xl p-4 sage-border" style={{ backgroundColor: "#fffdf6" }}>
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles size={12} color="#ca0013" />
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ca0013" }}>AI Estimate</p>
              </div>
              <p className="text-base font-extrabold text-charcoal">{aiPreview.name}</p>
              <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>
                {aiPreview.serving} · {aiPreview.calories} kcal · P{aiPreview.protein} C{aiPreview.carbs} F{aiPreview.fat}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={aiAddToLog} className="flex items-center gap-1 rounded-full px-4 py-2 text-xs font-extrabold text-white" style={{ backgroundColor: "#ca0013" }}>
                  <Plus size={12} /> Add to Log
                </button>
                {userId && (
                  <button onClick={aiSaveToMyFoods} disabled={aiSaving} className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-charcoal sage-border-soft disabled:opacity-60">
                    {aiSaving ? <Loader2 size={12} className="animate-spin" /> : <BookmarkPlus size={12} color="#ca0013" />} Save to My Foods
                  </button>
                )}
                <button onClick={() => setAiPreview(null)} className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-charcoal sage-border-soft">Cancel</button>
              </div>
            </div>
          )}

          {results.length === 0 && !aiPreview && (
            <div className="py-8 text-center">
              <p className="text-sm font-bold" style={{ color: "#b7c6c2" }}>
                {tab === "recent" ? "No recent foods yet — log a meal to populate this list."
                 : tab === "my" ? "You haven't saved any foods yet."
                 : "No foods found"}
              </p>
              {q.trim() && (
                <button onClick={runAiAnalyze} disabled={aiLoading} className="mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60" style={{ backgroundColor: "#ca0013" }}>
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Analyze with AI
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete this food?</DialogTitle>
            <DialogDescription>"{confirmDelete?.name}" will be removed from My Foods.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-charcoal sage-border">Cancel</button>
            <button onClick={doDelete} className="rounded-full px-4 py-2 text-xs font-extrabold text-white" style={{ backgroundColor: "#ca0013" }}>Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
