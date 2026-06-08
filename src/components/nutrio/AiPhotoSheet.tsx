import { useRef, useState } from "react";
import { X, Camera, Sparkles, Loader2, RotateCcw, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { recognizeFood, type RecognizedFood } from "@/lib/ai-food.functions";
import { MEAL_EMOJI, MEAL_LABELS, type MealType, type Food } from "@/lib/nutrio-data";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
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
        const maxDim = 1024;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AiPhotoSheet({ open, onClose, onAdd }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecognizedFood | null>(null);
  const [meal, setMeal] = useState<MealType>("breakfast");
  const recognize = useServerFn(recognizeFood);

  const reset = () => {
    setPreview(null);
    setResult(null);
    setLoading(false);
  };

  const handleFile = async (file: File) => {
    try {
      reset();
      const dataUrl = await downscale(file);
      setPreview(dataUrl);
      setLoading(true);
      const r = await recognize({ data: { imageDataUrl: dataUrl } });
      setResult(r);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not analyze image");
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!result) return;
    const food: Food = {
      id: `ai-${Date.now()}`,
      name: result.name,
      category: "AI Scan",
      serving: result.serving,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      fiber: result.fiber,
    };
    onAdd(food, meal);
    toast.success(`Added ${result.name} to ${MEAL_LABELS[meal]}`);
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(23,30,25,0.4)" }}
      onClick={() => {
        reset();
        onClose();
      }}
    >
      <div
        className="animate-fade-in flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(202,0,19,0.1)" }}
            >
              <Sparkles size={16} color="#ca0013" />
            </div>
            <h2 className="text-xl font-black text-charcoal">AI Food Scan</h2>
          </div>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full sage-border"
            aria-label="Close"
          >
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
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "#ca0013" }}
            >
              <Camera size={28} color="#fff" />
            </div>
            <p className="text-sm font-extrabold text-charcoal">Take or upload a photo</p>
            <p className="px-6 text-center text-xs font-bold" style={{ color: "#b7c6c2" }}>
              AI will identify the dish and estimate calories & macros.
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
          </div>
        )}

        {result && !loading && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-white p-4 sage-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-label" style={{ color: "#b7c6c2" }}>
                    Detected · {result.confidence} confidence
                  </p>
                  <p className="text-lg font-black text-charcoal">{result.name}</p>
                  <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>
                    {result.serving}
                  </p>
                </div>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sage-border"
                  aria-label="Retake"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                {[
                  { l: "Kcal", v: result.calories },
                  { l: "P", v: result.protein },
                  { l: "C", v: result.carbs },
                  { l: "F", v: result.fat },
                  { l: "Fib", v: result.fiber },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-cream py-2">
                    <p className="text-sm font-black text-charcoal">{s.v}</p>
                    <p className="text-[10px] font-bold" style={{ color: "#b7c6c2" }}>
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-label" style={{ color: "#b7c6c2" }}>
                Add to
              </p>
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
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black text-white"
              style={{ backgroundColor: "#ca0013" }}
            >
              <Check size={18} /> Add to {MEAL_LABELS[meal]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
