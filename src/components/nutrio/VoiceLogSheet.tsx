import { useEffect, useRef, useState } from "react";
import { X, Mic, Loader2, Check, Trash2, Sparkles, BookmarkPlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { parseFoodText, estimateFood } from "@/lib/ai-food.functions";
import { findFood, MEAL_EMOJI, MEAL_LABELS, type Food, type MealType } from "@/lib/nutrio-data";
import { scaleFood, smartMultiplier } from "@/lib/quantity";
import { useCustomFoods } from "@/hooks/use-custom-foods";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultMeal: MealType;
  userId?: string;
  onAdd: (food: Food, meal: MealType) => void;
};

type Resolved = {
  key: string;
  food: Food;
  qty: number;
  unit?: string;
  matched: boolean;
  estimating?: boolean;
};

export function VoiceLogSheet({ open, onClose, defaultMeal, userId, onAdd }: Props) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Resolved[]>([]);
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const recRef = useRef<any>(null);
  const parse = useServerFn(parseFoodText);
  const estimate = useServerFn(estimateFood);
  const { addCustomFood } = useCustomFoods(userId);

  useEffect(() => {
    if (!open) return;
    setMeal(defaultMeal);
    const SR: any =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    setSupported(!!SR);
  }, [open, defaultMeal]);

  const start = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice not supported in this browser");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setTranscript(txt);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
    setTranscript("");
    setItems([]);
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const analyze = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    try {
      const { items: parsed } = await parse({ data: { text: t } });
      const resolved: Resolved[] = parsed.map((p, idx) => {
        const f = findFood(p.name);
        if (f) {
          const mult = smartMultiplier(f, p.quantity, p.unit);
          return { key: `${idx}-${p.name}`, food: scaleFood(f, mult), qty: p.quantity, unit: p.unit, matched: true };
        }
        return {
          key: `${idx}-${p.name}`,
          food: {
            id: `voice-${idx}`,
            name: p.name.replace(/\b\w/g, (c) => c.toUpperCase()),
            category: "Unknown",
            serving: p.unit ? `${p.quantity} ${p.unit}` : `${p.quantity} serving`,
            calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
          },
          qty: p.quantity,
          unit: p.unit,
          matched: false,
        };
      });
      if (resolved.length === 0) toast.error("Couldn't detect any food");
      setItems(resolved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not parse");
    } finally {
      setLoading(false);
    }
  };

  const estimateAt = async (idx: number) => {
    const it = items[idx];
    if (!it) return;
    setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, estimating: true } : x)));
    try {
      const r = await estimate({ data: { name: it.food.name } });
      const food: Food = {
        id: it.food.id,
        name: r.name,
        category: "Unknown",
        serving: r.serving,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        fiber: r.fiber,
      };
      setItems((arr) =>
        arr.map((x, i) => (i === idx ? { ...x, food, matched: true, estimating: false } : x)),
      );
    } catch (e) {
      setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, estimating: false } : x)));
      toast.error(e instanceof Error ? e.message : "Could not estimate");
    }
  };

  const saveAt = async (idx: number) => {
    const it = items[idx];
    if (!it || !userId) return;
    try {
      await addCustomFood({
        name: it.food.name,
        category: "My Foods",
        serving: it.food.serving,
        calories: it.food.calories,
        protein: it.food.protein,
        carbs: it.food.carbs,
        fat: it.food.fat,
        fiber: it.food.fiber,
      });
      toast.success("Saved to My Foods");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const confirm = () => {
    const ok = items.filter((i) => i.matched);
    ok.forEach((i) => onAdd(i.food, meal));
    if (ok.length === 0) {
      toast.error("No matched foods to add");
      return;
    }
    toast.success(`Added ${ok.length} item${ok.length === 1 ? "" : "s"} to ${MEAL_LABELS[meal]}`);
    setItems([]);
    setTranscript("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div className="animate-fade-in flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 pb-32" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(202,0,19,0.1)" }}>
              <Mic size={16} color="#ca0013" />
            </div>
            <h2 className="text-xl font-black text-charcoal">Voice Log</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!supported ? (
          <p className="rounded-2xl bg-cream p-4 text-center text-sm font-bold text-charcoal">
            Voice input isn't supported in this browser. Try Chrome or Safari on mobile.
          </p>
        ) : (
          <>
            <button
              onClick={listening ? stop : start}
              className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-[2rem] sage-border-soft transition-colors"
              style={{ backgroundColor: listening ? "#ca0013" : "#fffdf6" }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: listening ? "#fff" : "#ca0013" }}>
                <Mic size={28} color={listening ? "#ca0013" : "#fff"} className={listening ? "animate-pulse" : ""} />
              </div>
              <p className="text-sm font-extrabold" style={{ color: listening ? "#fff" : "#171e19" }}>
                {listening ? "Listening… tap to stop" : "Tap and say e.g. \"2 idlis and a coffee\""}
              </p>
            </button>

            {(transcript || items.length > 0) && (
              <div className="mt-3 rounded-2xl bg-cream p-3">
                <p className="text-label" style={{ color: "#b7c6c2" }}>Heard</p>
                <p className="text-sm font-bold text-charcoal">{transcript || "—"}</p>
                {!loading && !listening && transcript && items.length === 0 && (
                  <button
                    onClick={() => analyze(transcript)}
                    className="mt-2 flex items-center gap-1 text-xs font-extrabold"
                    style={{ color: "#ca0013" }}
                  >
                    <Sparkles size={12} /> Analyze
                  </button>
                )}
              </div>
            )}

            {loading && (
              <div className="mt-3 flex items-center justify-center gap-2 py-4">
                <Loader2 size={18} className="animate-spin" color="#ca0013" />
                <span className="text-sm font-bold text-charcoal">Parsing…</span>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-4 space-y-2">
                {items.map((it, idx) => (
                  <div key={it.key} className="rounded-2xl bg-white p-3 sage-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg" style={{ backgroundColor: it.matched ? "rgba(202,0,19,0.1)" : "rgba(183,198,194,0.3)" }}>
                        {it.matched ? "🍽️" : "❓"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-charcoal">{it.food.name}</p>
                        <p className="truncate text-[11px] font-bold" style={{ color: it.matched ? "#b7c6c2" : "#ca0013" }}>
                          {it.matched
                            ? `${it.food.serving} · ${it.food.calories} kcal · P${it.food.protein} C${it.food.carbs} F${it.food.fat}`
                            : "Unknown dish — estimate to add"}
                        </p>
                      </div>
                      <button
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="flex h-9 w-9 items-center justify-center rounded-full sage-border-soft"
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {!it.matched && (
                      <button
                        onClick={() => estimateAt(idx)}
                        disabled={it.estimating}
                        className="mt-2 flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-[11px] font-extrabold text-charcoal sage-border-soft disabled:opacity-50"
                      >
                        {it.estimating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} color="#ca0013" />}
                        Estimate with AI
                      </button>
                    )}
                    {it.matched && userId && it.food.calories > 0 && (
                      <button
                        onClick={() => saveAt(idx)}
                        className="mt-2 flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-[11px] font-extrabold text-charcoal sage-border-soft"
                      >
                        <BookmarkPlus size={12} color="#ca0013" /> Save to My Foods
                      </button>
                    )}
                  </div>
                ))}

                <div>
                  <p className="mb-2 mt-3 text-label" style={{ color: "#b7c6c2" }}>Add to</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => {
                      const active = m === meal;
                      return (
                        <button
                          key={m}
                          onClick={() => setMeal(m)}
                          className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold"
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
                </div>

                <button
                  onClick={confirm}
                  className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black text-white"
                  style={{ backgroundColor: "#ca0013" }}
                >
                  <Check size={18} /> Add {items.filter((i) => i.matched).length} item(s)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
