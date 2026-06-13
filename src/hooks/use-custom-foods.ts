import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Food } from "@/lib/nutrio-data";

export type CustomFoodRow = {
  id: string;
  name: string;
  category: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  diet: string | null;
};

const toFood = (r: CustomFoodRow): Food => ({
  id: `cf-${r.id}`,
  name: r.name,
  category: r.category || "My Foods",
  serving: r.serving,
  calories: Number(r.calories),
  protein: Number(r.protein),
  carbs: Number(r.carbs),
  fat: Number(r.fat),
  fiber: Number(r.fiber),
  source: "user",
  diet: (r.diet as Food["diet"]) ?? undefined,
});

export function useCustomFoods(userId: string | undefined) {
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["custom_foods", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_foods")
        .select("id,name,category,serving,calories,protein,carbs,fat,fiber,diet")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomFoodRow[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const add = useMutation({
    mutationFn: async (f: Omit<Food, "id">) => {
      if (!userId) throw new Error("Unauthorized");
      const { data, error } = await supabase
        .from("custom_foods")
        .insert({
          user_id: userId,
          name: f.name,
          category: f.category || "My Foods",
          serving: f.serving,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          fiber: f.fiber,
          diet: f.diet ?? null,
        })
        .select("id,name,category,serving,calories,protein,carbs,fat,fiber,diet")
        .single();
      if (error) throw error;
      return data as CustomFoodRow;
    },
    onSuccess: (row) => {
      qc.setQueryData<CustomFoodRow[]>(["custom_foods", userId], (prev = []) => [row, ...prev]);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const rawId = id.startsWith("cf-") ? id.slice(3) : id;
      const { error } = await supabase
        .from("custom_foods")
        .delete()
        .eq("id", rawId)
        .eq("user_id", userId!);
      if (error) throw error;
      return rawId;
    },
    onSuccess: (rawId) => {
      qc.setQueryData<CustomFoodRow[]>(["custom_foods", userId], (prev = []) =>
        prev.filter((r) => r.id !== rawId)
      );
    },
  });

  return {
    customFoods: rows.map(toFood),
    addCustomFood: add.mutateAsync,
    deleteCustomFood: remove.mutateAsync,
    isAdding: add.isPending,
  };
}

