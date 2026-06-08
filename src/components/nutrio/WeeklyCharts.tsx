// All recharts imports live in this module so it can be code-split via React.lazy.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export type DayRow = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
};

const axisTick = { fontSize: 10, fontWeight: 700, fill: "#b7c6c2" } as const;
const yTick = { fontSize: 10, fill: "#b7c6c2" } as const;
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(183,198,194,0.5)",
  fontSize: 12,
} as const;

export function CaloriesChart({ days, goal }: { days: DayRow[]; goal?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={days} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#eeebe3" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={yTick} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(183,198,194,0.15)" }}
          contentStyle={tooltipStyle}
        />
        {goal ? (
          <ReferenceLine y={goal} stroke="#ca0013" strokeDasharray="4 4" strokeWidth={1.5} />
        ) : null}
        <Bar dataKey="calories" fill="#171e19" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MacrosChart({ days }: { days: DayRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#eeebe3" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={yTick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="protein" stroke="#ca0013" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="carbs" stroke="#171e19" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="fat" stroke="#b7c6c2" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="fiber" stroke="#7a9990" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WaterChart({ days, goalMl }: { days: DayRow[]; goalMl?: number }) {
  const data = days.map((d) => ({ ...d, waterL: +(d.water / 1000).toFixed(2) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#eeebe3" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={yTick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {goalMl ? (
          <ReferenceLine
            y={goalMl / 1000}
            stroke="#ca0013"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        ) : null}
        <Bar dataKey="waterL" fill="#ca0013" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Default export so it works cleanly with React.lazy consumers that prefer a single chunk.
const WeeklyCharts = { CaloriesChart, MacrosChart, WaterChart };
export default WeeklyCharts;
