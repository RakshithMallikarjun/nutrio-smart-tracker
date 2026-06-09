import { useEffect, useRef, useState } from "react";
import { X, ScanBarcode, Loader2, Check } from "lucide-react";
import { MEAL_EMOJI, MEAL_LABELS, type Food, type MealType } from "@/lib/nutrio-data";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultMeal: MealType;
  onAdd: (food: Food, meal: MealType) => void;
};

export function BarcodeSheet({ open, onClose, defaultMeal, onAdd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [supported, setSupported] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string>("");
  const [found, setFound] = useState<Food | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    setMeal(defaultMeal);
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            stop();
            lookup(codes[0].rawValue);
            return;
          }
        } catch { /* ignore frame errors */ }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      toast.error("Camera access denied");
    }
  };

  const lookup = async (barcode: string) => {
    setCode(barcode);
    setLoading(true);
    setNotFound(false);
    setFound(null);
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,serving_size,nutriments`);
      const json = await resp.json();
      if (json.status !== 1 || !json.product) {
        setNotFound(true);
        return;
      }
      const p = json.product;
      const n = p.nutriments || {};
      const serving = p.serving_size || "100g";
      const factor = p.serving_size && n["energy-kcal_serving"] ? 1 : 1; // OFF already gives _serving when available
      const cals = n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0;
      const food: Food = {
        id: `bc-${barcode}`,
        name: [p.brands, p.product_name].filter(Boolean).join(" — ") || "Scanned product",
        category: "Scanned",
        serving,
        calories: Math.round(Number(cals) * factor),
        protein: Math.round((n.proteins_serving ?? n.proteins_100g ?? 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0) * 10) / 10,
        fat: Math.round((n.fat_serving ?? n.fat_100g ?? 0) * 10) / 10,
        fiber: Math.round((n.fiber_serving ?? n.fiber_100g ?? 0) * 10) / 10,
      };
      setFound(food);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!found) return;
    onAdd(found, meal);
    toast.success(`Added ${found.name} to ${MEAL_LABELS[meal]}`);
    setFound(null);
    setCode("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={() => { stop(); onClose(); }}>
      <div className="animate-fade-in flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[2.5rem] bg-white p-6 pb-32" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(202,0,19,0.1)" }}>
              <ScanBarcode size={16} color="#ca0013" />
            </div>
            <h2 className="text-xl font-black text-charcoal">Barcode Scan</h2>
          </div>
          <button onClick={() => { stop(); onClose(); }} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!supported && (
          <p className="mb-3 rounded-2xl bg-cream p-3 text-center text-xs font-bold text-charcoal">
            Live scanning needs Chrome on Android. You can still enter a barcode manually below.
          </p>
        )}

        {supported && !found && !notFound && (
          <div className="relative overflow-hidden rounded-[2rem] bg-cream">
            <video ref={videoRef} className="h-56 w-full object-cover" playsInline muted />
            {!scanning && (
              <button
                onClick={start}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: "rgba(23,30,25,0.55)" }}
              >
                <ScanBarcode size={28} color="#fff" />
                <span className="text-sm font-extrabold text-white">Start camera</span>
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Or enter barcode digits"
            className="flex-1 rounded-2xl bg-cream px-4 py-3 text-sm font-bold text-charcoal outline-none sage-border-soft"
          />
          <button
            onClick={() => manual && lookup(manual)}
            disabled={!manual || loading}
            className="rounded-2xl px-4 text-sm font-extrabold text-white disabled:opacity-50"
            style={{ backgroundColor: "#171e19" }}
          >
            Look up
          </button>
        </div>

        {loading && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" color="#ca0013" />
            <span className="text-sm font-bold">Looking up {code}…</span>
          </div>
        )}

        {notFound && (
          <p className="mt-3 rounded-2xl bg-cream p-3 text-center text-xs font-bold text-charcoal">
            Product not found for {code}. Search manually instead.
          </p>
        )}

        {found && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white p-4 sage-border">
              <p className="text-label" style={{ color: "#b7c6c2" }}>Scanned · {code}</p>
              <p className="text-lg font-black text-charcoal">{found.name}</p>
              <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>{found.serving}</p>
              <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                {[
                  { l: "Kcal", v: found.calories },
                  { l: "P", v: found.protein },
                  { l: "C", v: found.carbs },
                  { l: "F", v: found.fat },
                  { l: "Fib", v: found.fiber },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-cream py-2">
                    <p className="text-sm font-black text-charcoal">{s.v}</p>
                    <p className="text-[10px] font-bold" style={{ color: "#b7c6c2" }}>{s.l}</p>
                  </div>
                ))}
              </div>
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

            <button onClick={confirm} className="flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black text-white" style={{ backgroundColor: "#ca0013" }}>
              <Check size={18} /> Add to {MEAL_LABELS[meal]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
