import { useMemo, useState } from "react";
import { X, Check, Copy, Loader2 } from "lucide-react";
import { MEAL_EMOJI, MEAL_LABELS, type Food, type MealType } from "@/lib/nutrio-data";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { useYesterdayMeals } from "@/hooks/use-yesterday-meals";

type Props = {
  open: boolean;
  onClose: () => void;
  meal: MealType;
  userId: string | undefined;
  onCopy: (items: { food: Food; meal: MealType }[]) => Promise<void> | void;
};

export function CopyYesterdaySheet({ open, onClose, meal, userId, onCopy }: Props) {
  const { yesterdayItems } = useYesterdayMeals(userId);
  const items = useMemo(() => yesterdayItems.filter((y) => y.meal === meal), [yesterdayItems, meal]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const copy = async (which: "all" | "selected") => {
    const list = which === "all" ? items : items.filter((i) => selected.has(i.key));
    if (list.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    setBusy(true);
    try {
      await onCopy(list.map((i) => ({ food: i.food, meal: i.meal })));
      track("copy_yesterday", { meal, count: list.length, mode: which });
      toast.success(`${MEAL_LABELS[meal]} copied successfully.`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not copy");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div className="animate-fade-in w-full max-w-md rounded-t-[2.5rem] bg-white p-6 pb-32" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-label" style={{ color: "#b7c6c2" }}>Yesterday's {MEAL_LABELS[meal]}</p>
            <h2 className="text-xl font-black text-charcoal">{MEAL_EMOJI[meal]} Copy items</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-cream p-6 text-center">
            <p className="text-3xl">🗓️</p>
            <p className="mt-2 text-sm font-extrabold text-charcoal">Nothing logged yesterday</p>
            <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>Log your meals today to enable copy tomorrow.</p>
          </div>
        ) : (
          <>
            <ul className="max-h-[40vh] space-y-2 overflow-y-auto">
              {items.map((i) => {
                const on = selected.has(i.key);
                return (
                  <li key={i.key}>
                    <button
                      onClick={() => toggle(i.key)}
                      className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors"
                      style={{
                        backgroundColor: on ? "rgba(202,0,19,0.08)" : "#ffffff",
                        border: on ? "1px solid #ca0013" : "1px solid rgba(183,198,194,0.5)",
                      }}
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: on ? "#ca0013" : "transparent", border: on ? "none" : "1.5px solid #b7c6c2" }}>
                        {on && <Check size={14} color="#fff" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-charcoal">{i.food.name}</p>
                        <p className="truncate text-[11px] font-bold" style={{ color: "#b7c6c2" }}>
                          {i.food.serving} · {Math.round(i.food.calories)} kcal
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => copy("selected")}
                disabled={busy || selected.size === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-xs font-extrabold text-charcoal sage-border disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copy selected
              </button>
              <button
                onClick={() => copy("all")}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-extrabold text-white disabled:opacity-60"
                style={{ backgroundColor: "#ca0013" }}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copy all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
