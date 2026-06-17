const MUTED = "#8a8580";
const DARK = "#1a1a1a";

type Props = {
  weightLabel: string; // e.g. "82.0 kg"
  deltaLabel: string;  // e.g. "▼ 1.2kg 30d"
  deltaColor: string;
  onClick: () => void;
};

export function WeightTile({ weightLabel, deltaLabel, deltaColor, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="rounded-[14px] bg-white p-3 text-left active:scale-95"
      style={{ border: "0.5px solid #e8e4df" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Weight</p>
      <div className="mt-1 flex items-center gap-2">
        <Scale />
        <div className="min-w-0">
          <p className="text-[14px] font-black leading-none" style={{ color: DARK }}>
            {weightLabel}
          </p>
          <p className="mt-0.5 truncate text-[9.5px] font-semibold" style={{ color: deltaColor }}>
            {deltaLabel}
          </p>
        </div>
      </div>
    </button>
  );
}

function Scale() {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40">
      {/* dial */}
      <circle cx="17" cy="14" r="11" fill="#fff" stroke="#cfd8dc" strokeWidth="1.2" />
      {/* ticks */}
      {[-60, -30, 0, 30, 60].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 17 + Math.sin(rad) * 8;
        const y1 = 14 - Math.cos(rad) * 8;
        const x2 = 17 + Math.sin(rad) * 10;
        const y2 = 14 - Math.cos(rad) * 10;
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9aa3a8" strokeWidth="1" />;
      })}
      {/* needle */}
      <line x1="17" y1="14" x2="17" y2="6" stroke="#e03030" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="17" cy="14" r="1.5" fill="#1a1a1a" />
      {/* platform */}
      <rect x="3" y="28" width="28" height="4" rx="1.5" fill="#1a1a1a" />
      <rect x="6" y="32" width="22" height="5" rx="1.5" fill="#cfd8dc" />
      {/* stand */}
      <rect x="14" y="24" width="6" height="5" fill="#9aa3a8" />
    </svg>
  );
}
