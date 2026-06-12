import { X, Droplet, Undo2 } from "lucide-react";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onClose: () => void;
  total: number;
  goal: number;
  onAdd: (ml: number) => void;
  onUndo: () => void;
};

const QUICK = [250, 500, 750, 1000];

export function WaterSheet({ open, onClose, total, goal, onAdd, onUndo }: Props) {
  if (!open) return null;
  const pct = Math.min(100, (total / goal) * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(23,30,25,0.4)" }} onClick={onClose}>
      <div
        className="animate-fade-in w-full max-w-md rounded-t-[2.5rem] bg-white p-6 pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-charcoal">Water Intake</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full sage-border" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 rounded-[2rem] p-6 text-white" style={{ background: "linear-gradient(135deg,#171e19,#2a3a32)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <Droplet size={22} />
            </div>
            <div>
              <p className="text-label opacity-70">Today</p>
              <p className="text-3xl font-black">{(total / 1000).toFixed(2)} L</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: "#b7c6c2" }} />
          </div>
          <p className="mt-2 text-xs font-bold opacity-70">Goal {(goal / 1000).toFixed(1)} L · {Math.max(0, goal - total)} ml left</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {QUICK.map((ml) => (
            <button
              key={ml}
              onClick={() => {
                onAdd(ml);
                track("water_logged", { amount_ml: ml });
              }}
              className="flex flex-col items-center gap-1 rounded-2xl bg-cream py-5 font-extrabold text-charcoal transition-transform hover:scale-[1.02] active:scale-95 sage-border-soft"
            >
              <Droplet size={20} color="#ca0013" />
              <span className="text-lg">{ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onUndo}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-extrabold text-charcoal sage-border"
        >
          <Undo2 size={16} /> Undo last
        </button>
      </div>
    </div>
  );
}
