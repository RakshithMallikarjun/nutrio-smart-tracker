import { useEffect, useRef } from "react";
import { Flame, Trophy, Sparkles } from "lucide-react";
import { Ring } from "./Ring";
import type { StreakSummary } from "@/hooks/use-streak";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

type Props = { streak: StreakSummary };

const MILESTONES = [7, 30, 60, 100];

export function StreakCard({ streak }: Props) {
  const celebrated = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (streak.currentStreak === 0) return;
    if (MILESTONES.includes(streak.currentStreak) && !celebrated.current.has(streak.currentStreak)) {
      celebrated.current.add(streak.currentStreak);
      toast.success(`🎉 ${streak.currentStreak}-day streak! Keep it going.`);
      track("streak_milestone", { days: streak.currentStreak });
    }
    if (streak.isNewBest && !celebrated.current.has(-1)) {
      celebrated.current.add(-1);
      toast.success(`🏆 New personal best — ${streak.currentStreak} days!`);
      track("streak_new_best", { days: streak.currentStreak });
    }
  }, [streak.currentStreak, streak.isNewBest]);

  const motivational =
    streak.consistencyScore >= 80 ? "You're doing better than last week."
    : streak.consistencyScore >= 60 ? "Solid progress — log one more meal to push higher."
    : streak.currentStreak > 0 ? "Small steps add up. Keep logging."
    : "Log your first meal today to start a streak.";

  return (
    <section className="mx-5 mt-3 overflow-hidden rounded-[2rem] bg-white p-4 sage-border-soft">
      <div className="flex items-center gap-4">
        <Ring value={streak.consistencyScore} max={100} size={88} stroke={9} color="#ca0013">
          <span className="text-lg font-black leading-none text-charcoal">{streak.consistencyScore}%</span>
          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>Consistency</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Flame size={16} color="#ca0013" />
            <p className="text-lg font-black leading-none text-charcoal">
              {streak.currentStreak} day{streak.currentStreak === 1 ? "" : "s"}
            </p>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold" style={{ color: "#b7c6c2" }}>
            <Trophy size={11} /> Best {streak.longestStreak} day{streak.longestStreak === 1 ? "" : "s"}
          </p>
          <p className="mt-2 flex items-start gap-1 text-[11px] font-bold leading-snug text-charcoal">
            <Sparkles size={11} className="mt-0.5 shrink-0" color="#7a9990" />
            <span>{motivational}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {streak.componentBreakdown.map((c) => (
          <div
            key={c.label}
            title={`${c.label} (+${c.points})`}
            className="flex-1 rounded-full px-2 py-1 text-center text-[9px] font-extrabold uppercase tracking-wider"
            style={{
              backgroundColor: c.achieved ? "rgba(122,153,144,0.18)" : "rgba(183,198,194,0.18)",
              color: c.achieved ? "#171e19" : "#b7c6c2",
            }}
          >
            {c.label.split(" ")[0]}
          </div>
        ))}
      </div>
    </section>
  );
}
