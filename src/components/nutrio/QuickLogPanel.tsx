import { useState } from "react";
import { Mic, Camera, Droplet, Scale as ScaleIcon, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onVoice: () => void;
  onScan: () => void;
  onAddWater: (ml: number) => void;
  onLogWeight: () => void;
};

export function QuickLogPanel({ open, onClose, onVoice, onScan, onAddWater, onLogWeight }: Props) {
  const [waterOpen, setWaterOpen] = useState(false);
  if (!open) return null;

  const tiles = [
    { icon: <Mic size={20} />, label: "Voice log", onClick: () => { onVoice(); onClose(); } },
    { icon: <Camera size={20} />, label: "Scan dish", onClick: () => { onScan(); onClose(); } },
    { icon: <Droplet size={20} />, label: "Add water", onClick: () => setWaterOpen((v) => !v) },
    { icon: <ScaleIcon size={20} />, label: "Log weight", onClick: () => { onLogWeight(); onClose(); } },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={() => { setWaterOpen(false); onClose(); }}
    >
      <div
        className="animate-fade-in mb-24 w-full max-w-md px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl bg-white p-4" style={{ border: "0.5px solid #e8e4df" }}>
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t) => (
              <button
                key={t.label}
                onClick={t.onClick}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl py-5 text-[12px] font-extrabold active:scale-95"
                style={{ backgroundColor: "#faf8f5", color: "#1a1a1a", border: "0.5px solid #e8e4df" }}
              >
                <span style={{ color: "#e03030" }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          {waterOpen && (
            <div className="mt-3 flex gap-2">
              {[250, 500, 750].map((ml) => (
                <button
                  key={ml}
                  onClick={() => { onAddWater(ml); setWaterOpen(false); onClose(); }}
                  className="flex-1 rounded-xl py-2.5 text-[12px] font-extrabold text-white"
                  style={{ backgroundColor: "#3a9fdb" }}
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => { setWaterOpen(false); onClose(); }}
            aria-label="Close quick log"
            className="flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "#1a1a1a" }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
