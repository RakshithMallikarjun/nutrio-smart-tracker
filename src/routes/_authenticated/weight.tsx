import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Sparkles, X, Save, Scale } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useWeightLogs, displayWeight, kgToLb, lbToKg, type WeightUnit, type WeightLog } from "@/hooks/use-weight-logs";
import { generateWeightInsight } from "@/lib/weight-ai.functions";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/weight")({
  head: () => ({ meta: [{ title: "Body Weight — Nutrio" }] }),
  component: WeightPage,
});

type Range = "7d" | "30d" | "90d" | "all";
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "all": 9999 };
const RANGE_LABEL: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "all": "All time" };

function WeightPage() {
  const { user } = Route.useRouteContext();
  const userId = user?.id;
  const { logs, addWeight, updateWeight, deleteWeight, isLoading } = useWeightLogs(userId);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [range, setRange] = useState<Range>("30d");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WeightLog | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WeightLog | null>(null);
  const [insight, setInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);
  const insightFn = useServerFn(generateWeightInsight);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("weight_unit").eq("id", userId).maybeSingle().then(({ data }) => {
      if (data?.weight_unit === "lb" || data?.weight_unit === "kg") setUnit(data.weight_unit);
    });
  }, [userId]);

  const changeUnit = async (u: WeightUnit) => {
    setUnit(u);
    if (!userId) return;
    await supabase.from("profiles").upsert({ id: userId, weight_unit: u, updated_at: new Date().toISOString() });
  };

  const filtered = useMemo(() => {
    if (range === "all") return [...logs].reverse();
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
    return logs.filter((l) => new Date(l.log_date) >= cutoff).reverse();
  }, [logs, range]);

  const chartData = useMemo(
    () => filtered.map((l) => ({ date: l.log_date.slice(5), weight: Number(displayWeight(l.weight_kg, unit).toFixed(1)) })),
    [filtered, unit],
  );

  const stats = useMemo(() => {
    if (filtered.length < 2) return null;
    const start = filtered[0];
    const end = filtered[filtered.length - 1];
    const change = end.weight_kg - start.weight_kg;
    return { startKg: start.weight_kg, endKg: end.weight_kg, change, days: RANGE_DAYS[range] };
  }, [filtered, range]);

  const runInsight = async () => {
    if (!userId || !stats) { toast.error("Need at least 2 weight entries"); return; }
    setInsightLoading(true);
    try {
      // Calorie average over same window
      const since = new Date(); since.setDate(since.getDate() - stats.days);
      const [{ data: meals }, { data: goal }] = await Promise.all([
        supabase.from("meal_entries").select("log_date,calories").eq("user_id", userId).gte("log_date", since.toISOString().slice(0, 10)),
        supabase.from("goals").select("calories").eq("user_id", userId).maybeSingle(),
      ]);
      const byDay = new Map<string, number>();
      (meals ?? []).forEach((r) => byDay.set(String(r.log_date), (byDay.get(String(r.log_date)) ?? 0) + Number(r.calories)));
      const days = byDay.size || 1;
      const avg = Array.from(byDay.values()).reduce((a, b) => a + b, 0) / days;
      const calorieGoal = Number(goal?.calories ?? 2200);

      const { insight } = await insightFn({ data: {
        avgCalories: avg,
        calorieGoal,
        weightChangeKg: stats.change,
        days: stats.days,
        startKg: stats.startKg,
        endKg: stats.endKg,
      } });
      setInsight(insight);
      track("weight_insight_generated", { days: stats.days });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setInsightLoading(false);
    }
  };

  const unitLabel = unit === "kg" ? "kg" : "lb";
  const latest = logs[0];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-32" style={{ backgroundColor: "#eeebe3" }}>
      <header className="flex items-center justify-between px-5 pt-12">
        <Link to="/dashboard" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-white sage-border">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-black text-charcoal">Body Weight</h1>
        <div className="flex h-11 items-center rounded-full bg-white p-1 sage-border-soft">
          {(["kg", "lb"] as WeightUnit[]).map((u) => (
            <button key={u} onClick={() => changeUnit(u)} className="rounded-full px-3 py-1.5 text-xs font-extrabold uppercase" style={{ backgroundColor: u === unit ? "#171e19" : "transparent", color: u === unit ? "#fff" : "#171e19" }}>
              {u}
            </button>
          ))}
        </div>
      </header>

      {/* Current */}
      <section className="mx-5 mt-4 rounded-[2rem] bg-white p-5 sage-border-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(122,153,144,0.15)" }}>
            <Scale size={24} color="#7a9990" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-label" style={{ color: "#b7c6c2" }}>Current</p>
            <p className="text-2xl font-black leading-tight text-charcoal">
              {latest ? `${displayWeight(latest.weight_kg, unit).toFixed(1)} ${unitLabel}` : "—"}
            </p>
            {stats && (
              <p className="text-[11px] font-bold" style={{ color: stats.change < 0 ? "#7a9990" : stats.change > 0 ? "#ca0013" : "#b7c6c2" }}>
                {stats.change > 0 ? "+" : ""}{displayWeight(stats.change, unit).toFixed(1)} {unitLabel} in {RANGE_LABEL[range]}
              </p>
            )}
          </div>
          <button onClick={() => setAddOpen(true)} className="flex h-11 items-center gap-1 rounded-full px-4 text-xs font-extrabold text-white" style={{ backgroundColor: "#ca0013" }}>
            <Plus size={14} /> Log
          </button>
        </div>
      </section>

      {/* Range chips */}
      <div className="mx-5 mt-4 grid grid-cols-4 gap-1 rounded-full bg-white p-1 sage-border-soft">
        {(Object.keys(RANGE_LABEL) as Range[]).map((r) => {
          const active = r === range;
          return (
            <button key={r} onClick={() => setRange(r)} className="rounded-full py-2 text-[11px] font-extrabold" style={{ backgroundColor: active ? "#171e19" : "transparent", color: active ? "#fff" : "#171e19" }}>
              {RANGE_LABEL[r]}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <section className="mx-5 mt-4 rounded-[2rem] bg-white p-4 sage-border-soft">
        {chartData.length < 2 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-bold" style={{ color: "#b7c6c2" }}>
              {isLoading ? "Loading…" : "Add at least 2 entries to see your trend"}
            </p>
          </div>
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="rgba(183,198,194,0.2)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "#b7c6c2" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(183,198,194,0.5)", fontSize: 12, fontWeight: 700 }} />
                <Line type="monotone" dataKey="weight" stroke="#ca0013" strokeWidth={3} dot={{ r: 3, fill: "#ca0013" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* AI Insight */}
      <section className="mx-5 mt-3 rounded-[2rem] p-4 sage-border-soft" style={{ backgroundColor: "#fffdf6" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} color="#ca0013" />
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ca0013" }}>AI Insight</p>
          </div>
          <button onClick={runInsight} disabled={insightLoading || !stats} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-50" style={{ backgroundColor: "#171e19" }}>
            {insightLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {insight ? "Regenerate" : "Generate"}
          </button>
        </div>
        <p className="mt-2 text-sm font-bold leading-snug text-charcoal">
          {insight || (stats ? "Tap Generate for a personalized insight based on your weight + calories." : "Log more weights and meals to unlock AI insights.")}
        </p>
      </section>

      {/* History */}
      <section className="mx-5 mt-3">
        <h2 className="mb-2 text-sm font-extrabold text-charcoal">History</h2>
        {logs.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center sage-border">
            <p className="text-3xl">⚖️</p>
            <p className="mt-2 text-sm font-extrabold text-charcoal">No entries yet</p>
            <p className="text-xs font-bold" style={{ color: "#b7c6c2" }}>Tap "Log" to add your first weight.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 sage-border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-charcoal">{displayWeight(l.weight_kg, unit).toFixed(1)} {unitLabel}</p>
                  <p className="text-[11px] font-bold" style={{ color: "#b7c6c2" }}>{new Date(l.log_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <button onClick={() => setEditing(l)} className="flex h-9 w-9 items-center justify-center rounded-full sage-border-soft" aria-label="Edit"><Pencil size={13} /></button>
                <button onClick={() => setConfirmDelete(l)} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ border: "1px solid #ca0013", color: "#ca0013" }} aria-label="Delete"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WeightFormDialog
        open={addOpen || !!editing}
        unit={unit}
        existing={editing}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        onSubmit={async (kg, date) => {
          if (editing) {
            await updateWeight({ id: editing.id, patch: { weight_kg: kg, log_date: date } });
            toast.success("Updated");
          } else {
            await addWeight({ weight_kg: kg, log_date: date });
            toast.success("Logged");
            track("weight_logged", { weight_kg: kg });
          }
        }}
      />

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-charcoal sage-border">Cancel</button>
            <button
              onClick={async () => {
                if (!confirmDelete) return;
                await deleteWeight(confirmDelete.id);
                setConfirmDelete(null);
                toast.success("Deleted");
              }}
              className="rounded-full px-4 py-2 text-xs font-extrabold text-white"
              style={{ backgroundColor: "#ca0013" }}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WeightFormDialog({
  open, unit, existing, onClose, onSubmit,
}: {
  open: boolean;
  unit: WeightUnit;
  existing: WeightLog | null;
  onClose: () => void;
  onSubmit: (kg: number, date: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setValue(displayWeight(existing.weight_kg, unit).toFixed(1));
      setDate(existing.log_date);
    } else {
      setValue("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, existing, unit]);

  const submit = async () => {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Enter a valid weight"); return; }
    const kg = unit === "kg" ? n : lbToKg(n);
    setBusy(true);
    try { await onSubmit(kg, date); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit weight" : "Log weight"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Weight ({unit})</label>
            <input
              type="number" inputMode="decimal" step="0.1" autoFocus
              value={value} onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-full rounded-xl bg-cream px-3 py-2.5 text-lg font-black text-charcoal outline-none sage-border-soft"
              placeholder={unit === "kg" ? "70.5" : "155.4"}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Date</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-xl bg-cream px-3 py-2.5 text-sm font-extrabold text-charcoal outline-none sage-border-soft"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button onClick={onClose} className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-charcoal sage-border">
            <X size={12} className="mr-1 inline" />Cancel
          </button>
          <button onClick={submit} disabled={busy} className="rounded-full px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60" style={{ backgroundColor: "#ca0013" }}>
            {busy ? <Loader2 size={12} className="inline animate-spin" /> : <Save size={12} className="mr-1 inline" />} Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
