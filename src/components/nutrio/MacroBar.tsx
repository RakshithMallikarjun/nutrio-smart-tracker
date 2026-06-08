type Props = { label: string; value: number; max: number; unit?: string; color?: string };

export function MacroBar({ label, value, max, unit = "g", color = "#171e19" }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="glass-card rounded-2xl p-3 sage-border-soft">
      <div className="flex items-center justify-between">
        <span className="text-label" style={{ color: "#b7c6c2" }}>{label}</span>
        <span className="text-xs font-extrabold text-charcoal">{Math.round(value)}/{max}{unit}</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full" style={{ backgroundColor: "rgba(183,198,194,0.3)" }}>
        <div
          className="h-2 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
