import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MealType } from "@/lib/nutrio-data";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export type StreakSummary = {
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
  componentBreakdown: { label: string; achieved: boolean; points: number }[];
  isNewBest: boolean;
};

type Args = {
  userId: string | undefined;
  todayMealsByType: Set<MealType>;
  caloriesToday: number;
  calorieGoal: number;
  waterToday: number;
  waterGoal: number;
};

export function useStreak({ userId, todayMealsByType, caloriesToday, calorieGoal, waterToday, waterGoal }: Args): StreakSummary {
  const qc = useQueryClient();

  // distinct meal_entries dates in the last 365 days
  const { data: dates = [] } = useQuery({
    queryKey: ["streak-dates", userId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 365);
      const { data } = await supabase
        .from("meal_entries")
        .select("log_date")
        .eq("user_id", userId!)
        .gte("log_date", ymd(since));
      const set = new Set<string>();
      (data ?? []).forEach((r) => set.add(String(r.log_date)));
      return Array.from(set).sort();
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const { data: storedLongest = 0 } = useQuery({
    queryKey: ["streak-longest", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("longest_streak").eq("id", userId!).maybeSingle();
      return Number(data?.longest_streak ?? 0);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { current, longest } = useMemo(() => {
    if (dates.length === 0) return { current: 0, longest: 0 };
    const set = new Set(dates);
    const today = ymd(new Date());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = ymd(y);

    // current streak: walk back from today (or yesterday if not logged today)
    let cur = 0;
    let cursor = new Date();
    if (!set.has(today)) {
      if (set.has(yesterday)) cursor.setDate(cursor.getDate() - 1);
      else return { current: 0, longest: computeLongest(dates) };
    }
    while (set.has(ymd(cursor))) {
      cur++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { current: cur, longest: Math.max(cur, computeLongest(dates)) };
  }, [dates]);

  const longestStreak = Math.max(longest, storedLongest);
  const isNewBest = current > 0 && current > storedLongest;

  // Persist new personal best in profiles
  useEffect(() => {
    if (!userId || !isNewBest) return;
    supabase
      .from("profiles")
      .upsert({ id: userId, longest_streak: current, updated_at: new Date().toISOString() })
      .then(() => qc.setQueryData(["streak-longest", userId], current));
  }, [isNewBest, current, userId, qc]);

  // Consistency score (today)
  const breakfast = todayMealsByType.has("breakfast");
  const lunch = todayMealsByType.has("lunch");
  const dinner = todayMealsByType.has("dinner");
  const waterOK = waterGoal > 0 && waterToday >= waterGoal;
  const calorieOK = calorieGoal > 0 && caloriesToday >= calorieGoal * 0.8 && caloriesToday <= calorieGoal * 1.1;
  const components = [
    { label: "Breakfast", achieved: breakfast, points: 20 },
    { label: "Lunch", achieved: lunch, points: 20 },
    { label: "Dinner", achieved: dinner, points: 20 },
    { label: "Water goal", achieved: waterOK, points: 20 },
    { label: "Calories in target", achieved: calorieOK, points: 20 },
  ];
  const consistencyScore = components.reduce((a, c) => a + (c.achieved ? c.points : 0), 0);

  return { currentStreak: current, longestStreak, consistencyScore, componentBreakdown: components, isNewBest };
}

function computeLongest(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const cur = new Date(sortedDates[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) run++; else run = 1;
    if (run > best) best = run;
  }
  return best;
}
