import { useEffect, useState } from "react";

const MUTED = "#8a8580";
const DARK = "#1a1a1a";
const GREEN = "#22a06b";

type Props = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  water: boolean;
  calories: boolean;
};

const LABELS = ["B", "L", "D", "W", "C"];

export function ConsistencyTile({ breakfast, lunch, dinner, water, calories }: Props) {
  const states = [breakfast, lunch, dinner, water, calories];
  const filled = states.filter(Boolean).length;
  const pct = Math.round((filled / 5) * 100);
  const msg =
    filled <= 1 ? "Keep going!" : filled <= 3 ? "Getting there!" : filled === 4 ? "Almost there!" : "Well done!";

  // Ring
  const r = 16;
  const C = 2 * Math.PI * r;
  const off = C * (1 - filled / 5);

  return (
    <div
      className="rounded-[14px] bg-white p-3 text-left"
      style={{ border: "0.5px solid #e8e4df" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
        Consistency
      </p>
      <div className="mt-1 flex items-center gap-2">
        <svg width="38" height="38" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
          <circle
            cx="20" cy="20" r={r} fill="none" stroke={GREEN} strokeWidth="4"
            strokeDasharray={C} strokeDashoffset={off}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <p className="text-[16px] font-black leading-none" style={{ color: DARK }}>{pct}%</p>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {states.map((s, i) => (
          <Dot key={LABELS[i]} on={s} label={LABELS[i]} />
        ))}
      </div>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: MUTED }}>{msg}</p>
    </div>
  );
}

function Dot({ on, label }: { on: boolean; label: string }) {
  const [pulse, setPulse] = useState(false);
  const [prev, setPrev] = useState(on);
  useEffect(() => {
    if (on && !prev) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
    setPrev(on);
  }, [on, prev]);

  return (
    <span
      aria-label={label}
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{
        backgroundColor: on ? GREEN : "rgba(0,0,0,0.12)",
        transform: pulse ? "scale(1.8)" : "scale(1)",
        transition: "transform 0.6s ease, background-color 0.3s ease",
      }}
    />
  );
}
