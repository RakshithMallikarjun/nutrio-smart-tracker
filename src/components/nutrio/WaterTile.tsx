const MUTED = "#8a8580";
const DARK = "#1a1a1a";
const BLUE = "#3a9fdb";

type Props = {
  total: number;
  goal: number;
  onAdd: (ml: number) => void;
  onOpen: () => void;
};

export function WaterTile({ total, goal, onAdd, onOpen }: Props) {
  const pct = Math.min(100, (total / Math.max(1, goal)) * 100);
  return (
    <div
      className="rounded-[14px] bg-white p-3 text-left"
      style={{ border: "0.5px solid #e8e4df" }}
    >
      <button onClick={onOpen} className="w-full text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Water</p>
        <div className="mt-1 flex items-center gap-2">
          <Bottle pct={pct} />
          <div className="min-w-0">
            <p className="text-[14px] font-black leading-none" style={{ color: DARK }}>
              {(total / 1000).toFixed(1)}L
            </p>
            <p className="mt-0.5 text-[9.5px] font-semibold" style={{ color: MUTED }}>
              of {(goal / 1000).toFixed(1)}L
            </p>
          </div>
        </div>
      </button>
      <div className="mt-2 flex gap-1">
        {[250, 500, 750].map((ml) => (
          <button
            key={ml}
            onClick={(e) => { e.stopPropagation(); onAdd(ml); }}
            className="flex-1 rounded-md py-1 text-[9.5px] font-extrabold"
            style={{ backgroundColor: "rgba(58,159,219,0.10)", color: BLUE }}
          >
            +{ml >= 1000 ? `${ml / 1000}L` : `${ml}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bottle({ pct }: { pct: number }) {
  // bottle ~ 26 wide × 50 tall
  const W = 26, H = 50;
  // body inside (clip area): y 14 to 46 (height 32)
  const bodyTop = 14, bodyBottom = 46;
  const bodyH = bodyBottom - bodyTop;
  const fillH = (bodyH * pct) / 100;
  const fillY = bodyBottom - fillH;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <clipPath id="bottleClip">
          <path d="M9 14 Q9 11 12 10 L12 5 H14 V10 Q17 11 17 14 V44 Q17 47 14 47 H12 Q9 47 9 44 Z" />
        </clipPath>
      </defs>
      {/* cap */}
      <rect x="11" y="2" width="4" height="5" rx="1" fill="#9aa3a8" />
      {/* outline */}
      <path
        d="M9 14 Q9 11 12 10 L12 5 H14 V10 Q17 11 17 14 V44 Q17 47 14 47 H12 Q9 47 9 44 Z"
        fill="rgba(58,159,219,0.08)"
        stroke="#cfd8dc"
        strokeWidth="1"
      />
      {/* fill */}
      <rect
        x="0"
        y={fillY}
        width={W}
        height={fillH}
        fill={BLUE}
        clipPath="url(#bottleClip)"
        style={{ transition: "y 0.5s ease, height 0.5s ease" }}
      />
    </svg>
  );
}
