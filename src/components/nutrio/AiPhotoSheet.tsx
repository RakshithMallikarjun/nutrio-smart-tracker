import { useEffect, useRef, useState } from "react";
import { X, Camera, Sparkles, Loader2, RotateCcw, Check, BookmarkPlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { recognizeFoods, type RecognizedFood } from "@/lib/ai-food.functions";
import { MEAL_EMOJI, MEAL_LABELS, type MealType, type Food } from "@/lib/nutrio-data";
import { useCustomFoods } from "@/hooks/use-custom-foods";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onClose: () => void;
  userId?: string;
  onAdd: (food: Food, meal: MealType) => void;
};

function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Bad image"));
      img.onload = () => {
        const maxDim = 768;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const CONF_COLOR: Record<RecognizedFood["confidence"], string> = {
  high: "#7a9990",
  medium: "#ca0013",
  low: "#b7c6c2",
};

export function AiPhotoSheet({ open, onClose, onAdd, userId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<RecognizedFood[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const recognize = useServerFn(recognizeFoods);
  const { addCustomFood, isAdding } = useCustomFoods(userId);

  const reset = () => {
    setPreview(null);
    setCandidates([]);
    setSelectedIdx(0);
    setLoading(false);
    setSaved(false);
    setAdding(false);
  };

  useEffect(() => { setSaved(false); }, [selectedIdx]);

  const handleFile = async (file: File) => {
    try {
      reset();
      const dataUrl = await downscale(file);
      setPreview(dataUrl);
      setLoading(true);
      const r = await recognize({ data: { imageDataUrl: dataUrl } });
      setCandidates(r.candidates);
      setSelectedIdx(0);
      track("ai_scan_result", {
        candidates: r.candidates.length,
        top_confidence: r.candidates[0]?.confidence ?? "none",
        top_food: r.candidates[0]?.name ?? "unknown",
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not analyze image");
    } finally {
      setLoading(false);
    }
  };

  const selected = candidates[selectedIdx];

  const toFood = (c: RecognizedFood): Food => ({
    id: `ai-${Date.now()}`,
    name: c.name,
    category: "AI Scan",
    serving: c.serving,
    calories: c.calories,
    protein: c.protein,
    carbs: c.carbs,
    fat: c.fat,
    fiber: c.fiber,
  });

  const confirm = async () => {
    if (!selected || adding) return;
    setAdding(true);
    try {
      track("ai_scan_confirmed", {
        food_name: selected.name,
        confidence: selected.confidence,
        meal,
      });
      onAdd(toFood(selected), meal);
      toast.success(`✓ ${selected.name} added to ${MEAL_LABELS[meal]}`);
      reset();
      onClose();
    } finally {
      setAdding(false);
    }
  };

  const saveToMyFoods = async () => {
    if (!selected || saved || isAdding) return;
    try {
      await addCustomFood({
        name: selected.name,
        category: "My Foods",
        serving: selected.serving,
        calories: selected.calories,
        protein: selected.protein,
        carbs: selected.carbs,
        fat: selected.fat,
        fiber: selected.fiber,
      });
      setSaved(true);
      toast.success(`"${selected.name}" saved to My Foods ✓`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(23,30,25,0.4)" }}
      onClick={() => { reset(); onClose(); }}
    >
      <div
        className="animate-fade-in flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(202,0,19,0.1)" }}>
              <Sparkles size={16} color="#ca0013" />
            </div>
            <h2 className="text-xl font-black text-charcoal">AI Food Scan</h2>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />

        {!preview && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-[2rem] bg-cream sage-border-soft"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#ca0013" }}>
              <Camera size={28} color="#fff" />
            </div>
            <p className="text-sm font-extrabold text-charcoal">Take or upload a photo</p>
            <p className="px-6 text-center text-xs font-bold" style={{ color: "#b7c6c2" }}>
              AI will suggest the top 3 dishes with confidence — pick the right one.
            </p>
          </button>
        )}

        {preview && (
          <div className="relative overflow-hidden rounded-[2rem] bg-cream">
            <img src={preview} alt="Food preview" className="h-56 w-full object-cover" />
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-charcoal/60">
                <Loader2 size={28} className="animate-spin text-white" />
                <p className="text-sm font-extrabold text-white">Analyzing…</p>
              </div>
            )}
            {!loading && (
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white sage-border"
                aria-label="Retake"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        )}

        {candidates.length > 0 && !loading && (
          <div className="mt-4 space-y-3">
            <p className="text-label" style={{ color: "#b7c6c2" }}>Top {candidates.length} {candidates.length === 1 ? "match" : "matches"} — tap to select</p>
            <div className="space-y-2">
              {candidates.map((c, i) => {
                const active = i === selectedIdx;
                return (
                  <button
                    key={`${c.name}-${i}`}
                    onClick={() => setSelectedIdx(i)}
                    className="w-full rounded-2xl p-3 text-left transition-colors"
                    style={{
                      backgroundColor: active ? "#171e19" : "#ffffff",
                      border: active ? "none" : "1px solid rgba(183,198,194,0.5)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black" style={{ color: active ? "#fff" : "#171e19" }}>{c.name}</p>
                        <p className="truncate text-[11px] font-bold" style={{ color: active ? "rgba(255,255,255,0.6)" : "#b7c6c2" }}>
                          {c.serving} · {c.calories} kcal · P{c.protein} C{c.carbs} F{c.fat}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white"
                        style={{ backgroundColor: CONF_COLOR[c.confidence] }}
                      >
                        {c.confidence}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="mb-2 text-label" style={{ color: "#b7c6c2" }}>Add to</p>
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

            <div className="flex gap-2">
              <button
                onClick={saveToMyFoods}
                disabled={!userId || saved || isAdding}
                className="flex h-12 shrink-0 items-center justify-center gap-1 rounded-full bg-cream px-4 text-xs font-extrabold text-charcoal sage-border-soft disabled:opacity-60"
                aria-label="Save to My Foods"
              >
                {isAdding ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : saved ? (
                  <><Check size={14} /> Saved</>
                ) : (
                  <><BookmarkPlus size={14} /> Save</>
                )}
              </button>
              <button
                onClick={confirm}
                disabled={adding}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-black text-white disabled:opacity-70"
                style={{ backgroundColor: "#ca0013" }}
              >
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {adding ? "Adding…" : `Add to ${MEAL_LABELS[meal]}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
