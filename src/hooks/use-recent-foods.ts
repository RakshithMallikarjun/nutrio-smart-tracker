import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Food } from "@/lib/nutrio-data";

type Row = {
  food_name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  logged_at: string;
};

function rowToFood(r: Row, idx: number): Food {
  return {
    id: `recent-${idx}-${r.food_name}`,
    name: r.food_name,
    category: "Recent",
    serving: r.serving,
    calories: Number(r.calories),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fat: Number(r.fat),
    fiber: Number(r.fiber),
  };
}

export function useRecentFoods(userId: string | undefined) {
  const { data: rows = [] } = useQuery({
    queryKey: ["recent-foods", userId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data } = await supabase
        .from("meal_entries")
        .select("food_name,serving,calories,protein,carbs,fat,fiber,logged_at")
        .eq("user_id", userId!)
        .gte("log_date", since.toISOString().slice(0, 10))
        .order("logged_at", { ascending: false })
        .limit(200);
      return (data ?? []) as Row[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const { recent, frequent } = useMemo(() => {
    const seenRecent = new Map<string, Food>();
    const counts = new Map<string, { count: number; latest: Row }>();
    rows.forEach((r, i) => {
      const key = r.food_name.trim().toLowerCase();
      if (!seenRecent.has(key)) seenRecent.set(key, rowToFood(r, i));
      const c = counts.get(key);
      if (c) c.count += 1; else counts.set(key, { count: 1, latest: r });
    });
    const recent = Array.from(seenRecent.values()).slice(0, 10);
    const frequent = Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([, v], i) => ({ ...rowToFood(v.latest, i), category: "Frequent", id: `freq-${i}-${v.latest.food_name}` }));
    return { recent, frequent };
  }, [rows]);

  return { recent, frequent };
}
