import { useMemo } from "react";

type Props = {
  heightCm: number | null;
  weightKg: number | null;
  targetBmi: number | null;
  onEditTarget?: () => void;
};

const CARD_BORDER = "0.5px solid #e8e4df";
const DARK = "#1a1a1a";
const MUTED = "#8a8580";

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "#e03030" };
  if (bmi < 25) return { label: "Normal", color: "#22a06b" };
  if (bmi < 30) return { label: "Overweight", color: "#f59e0b" };
  return { label: "Obese", color: "#e03030" };
}

const MIN = 15;
const MAX = 40;
const pct = (b: number) => ((Math.min(MAX, Math.max(MIN, b)) - MIN) / (MAX - MIN)) * 100;

export function BmiCard({ heightCm, weightKg, targetBmi, onEditTarget }: Props) {
  const bmi = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return null;
    const m = heightCm / 100;
    return weightKg / (m * m);
  }, [heightCm, weightKg]);

  const cat = bmi !== null ? bmiCategory(bmi) : null;
  const targetWeight = useMemo(() => {
    if (!targetBmi || !heightCm) return null;
    const m = heightCm / 100;
    return targetBmi * m * m;
  }, [targetBmi, heightCm]);

  return (
    <section className="mx-5 mt-4 rounded-[20px] bg-white p-4" style={{ border: CARD_BORDER }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-black" style={{ color: DARK }}>BMI</h2>
        {onEditTarget && (
          <button onClick={onEditTarget} className="text-[11px] font-bold" style={{ color: "#e03030" }}>
            {targetBmi ? `Target ${targetBmi.toFixed(1)}` : "Set target"}
          </button>
        )}
      </div>

      {bmi === null ? (
        <p className="text-[12px] font-semibold" style={{ color: MUTED }}>
          Add your height and log a weight to see BMI.
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[28px] font-black leading-none" style={{ color: DARK }}>{bmi.toFixed(1)}</p>
              <p className="mt-1 text-[11px] font-extrabold" style={{ color: cat!.color }}>{cat!.label}</p>
            </div>
            {targetBmi && (
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>To goal</p>
                <p className="text-[14px] font-black" style={{ color: DARK }}>
                  {(targetBmi - bmi).toFixed(1)}
                </p>
                {targetWeight !== null && (
                  <p className="text-[10px] font-semibold" style={{ color: MUTED }}>
                    Goal weight {targetWeight.toFixed(1)}kg
                  </p>
                )}
              </div>
            )}
          </div>

          {/* range bar */}
          <div className="relative mt-4 h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#f5efe7" }}>
            <div className="absolute inset-y-0" style={{ left: `${pct(15)}%`, width: `${pct(18.5) - pct(15)}%`, backgroundColor: "rgba(224,48,48,0.35)" }} />
            <div className="absolute inset-y-0" style={{ left: `${pct(18.5)}%`, width: `${pct(25) - pct(18.5)}%`, backgroundColor: "rgba(34,160,107,0.45)" }} />
            <div className="absolute inset-y-0" style={{ left: `${pct(25)}%`, width: `${pct(30) - pct(25)}%`, backgroundColor: "rgba(245,158,11,0.45)" }} />
            <div className="absolute inset-y-0" style={{ left: `${pct(30)}%`, right: 0, backgroundColor: "rgba(224,48,48,0.45)" }} />
          </div>
          <div className="relative h-4">
            {targetBmi && (
              <div
                className="absolute -translate-x-1/2"
                style={{ left: `${pct(targetBmi)}%`, top: -10 }}
                aria-label="Target"
              >
                <div className="h-3 w-[2px]" style={{ backgroundColor: "#1a1a1a" }} />
                <p className="mt-0.5 -translate-x-1/2 text-[9px] font-extrabold" style={{ color: MUTED, marginLeft: "50%" }}>▼</p>
              </div>
            )}
            <div
              className="absolute -translate-x-1/2"
              style={{ left: `${pct(bmi)}%`, top: -16 }}
              aria-label="Current BMI"
            >
              <div className="h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white" style={{ backgroundColor: cat!.color, marginLeft: "50%" }} />
            </div>
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-bold" style={{ color: MUTED }}>
            <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
          </div>
        </>
      )}
    </section>
  );
}
