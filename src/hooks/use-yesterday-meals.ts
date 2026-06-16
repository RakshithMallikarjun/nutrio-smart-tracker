import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MealType, Food } from "@/lib/nutrio-data";

export type YesterdayItem = {
  key: string;
  food: Food;
  meal: MealType;
};

export function useYesterdayMeals(userId: string | undefined) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const date = y.toISOString().slice(0, 10);

  const { data = [] } = useQuery({
    queryKey: ["yesterday-meals", userId, date],
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_entries")
        .select("id,food_name,serving,calories,protein,carbs,fat,fiber,meal_type")
        .eq("user_id", userId!)
        .eq("log_date", date)
        .order("logged_at", { ascending: true });
      return ((data ?? []) as Array<{
        id: string; food_name: string; serving: string; calories: number;
        protein: number; carbs: number; fat: number; fiber: number; meal_type: string;
      }>).map((r): YesterdayItem => ({
        key: r.id,
        meal: r.meal_type as MealType,
        food: {
          id: `yest-${r.id}`,
          name: r.food_name,
          category: "Yesterday",
          serving: r.serving,
          calories: Number(r.calories),
          protein: Number(r.protein),
          carbs: Number(r.carbs),
          fat: Number(r.fat),
          fiber: Number(r.fiber),
        },
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return { yesterdayItems: data };
}
