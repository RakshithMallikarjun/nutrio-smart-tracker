import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MealType, Food } from "@/lib/nutrio-data";
import { useMemo } from "react";

export type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water_ml: number;
};

export type MealRow = {
  id: string;
  food_name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  meal_type: MealType;
  logged_at: string;
};

const DEFAULT_GOALS: Goals = {
  calories: 2200, protein: 140, carbs: 240, fat: 70, fiber: 30, water_ml: 2500,
};

const today = () => new Date().toISOString().slice(0, 10);

export function useNutrioCloud(userId: string | undefined) {
  const qc = useQueryClient();
  const date = today();

  const { data: goals = DEFAULT_GOALS } = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*").eq("user_id", userId!).maybeSingle();
      return data
        ? { calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat, fiber: data.fiber, water_ml: data.water_ml }
        : DEFAULT_GOALS;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name").eq("id", userId!).maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: meals = [] } = useQuery({
    queryKey: ["meals", userId, date],
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_entries")
        .select("*")
        .eq("user_id", userId!)
        .eq("log_date", date)
        .order("logged_at", { ascending: true });
      return (data ?? []) as MealRow[];
    },
    enabled: !!userId,
  });

  const { data: water = [] } = useQuery({
    queryKey: ["water", userId, date],
    queryFn: async () => {
      const { data } = await supabase
        .from("water_entries")
        .select("id,quantity_ml")
        .eq("user_id", userId!)
        .eq("log_date", date);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const addFoodsMutation = useMutation({
    mutationFn: async (items: { food: Food; mealType: MealType }[]) => {
      if (!userId) throw new Error("Unauthorized");
      if (items.length === 0) return [] as MealRow[];
      const rows = items.map(({ food, mealType }) => ({
        user_id: userId, food_name: food.name, serving: food.serving,
        calories: food.calories, protein: food.protein, carbs: food.carbs,
        fat: food.fat, fiber: food.fiber, meal_type: mealType,
      }));
      const { data, error } = await supabase.from("meal_entries").insert(rows).select();
      if (error) throw error;
      return (data ?? []) as MealRow[];
    },
    onSuccess: (newRows) => {
      if (newRows.length === 0) return;
      qc.setQueryData<MealRow[]>(["meals", userId, date], (prev = []) => [...prev, ...newRows]);
    },
  });

  const removeMealMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("meal_entries").delete().eq("id", id);
    },
    onMutate: async (id) => {
      qc.setQueryData<MealRow[]>(["meals", userId, date], (prev = []) => prev.filter((m) => m.id !== id));
    },
  });

  type MealPatch = Partial<Pick<MealRow, "serving" | "calories" | "protein" | "carbs" | "fat" | "fiber">>;
  const updateMealMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MealPatch }) => {
      const { error } = await supabase.from("meal_entries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      qc.setQueryData<MealRow[]>(["meals", userId, date], (prev = []) =>
        prev.map((m) => (m.id === id ? ({ ...m, ...patch } as MealRow) : m)),
      );
    },
  });

  const addWaterMutation = useMutation({
    mutationFn: async (ml: number) => {
      if (!userId) throw new Error("Unauthorized");
      const { data } = await supabase.from("water_entries").insert({ user_id: userId, quantity_ml: ml }).select("id,quantity_ml").single();
      return data!;
    },
    onSuccess: (row) => {
      qc.setQueryData<typeof water>(["water", userId, date], (prev = []) => [...prev, row]);
    },
  });

  const undoWaterMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("water_entries").delete().eq("id", id);
    },
    onMutate: async (id) => {
      qc.setQueryData<typeof water>(["water", userId, date], (prev = []) => prev.filter((w) => w.id !== id));
    },
  });

  const setGoalsMutation = useMutation({
    mutationFn: async (next: Goals) => {
      if (!userId) throw new Error("Unauthorized");
      await supabase.from("goals").upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(["goals", userId], next);
    },
  });

  const totals = useMemo(
    () =>
      meals.reduce(
        (a, m) => ({
          calories: a.calories + Number(m.calories),
          protein: a.protein + Number(m.protein),
          carbs: a.carbs + Number(m.carbs),
          fat: a.fat + Number(m.fat),
          fiber: a.fiber + Number(m.fiber),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      ),
    [meals],
  );

  const waterTotal = useMemo(() => water.reduce((a, b) => a + b.quantity_ml, 0), [water]);
  const displayName = profile?.name ? profile.name.split(" ")[0] : "there";
  const lastWater = water[water.length - 1];

  return {
    goals,
    setGoals: setGoalsMutation.mutateAsync,
    meals,
    water,
    totals,
    waterTotal,
    displayName,
    addFood: (food: Food, mealType: MealType) =>
      addFoodsMutation.mutate([{ food, mealType }], {
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add food"),
      }),
    addFoods: (items: { food: Food; mealType: MealType }[]) =>
      addFoodsMutation.mutateAsync(items),
    removeMeal: (id: string) => removeMealMutation.mutate(id),
    updateMeal: (id: string, patch: Partial<Pick<MealRow, "serving" | "calories" | "protein" | "carbs" | "fat" | "fiber">>) =>
      updateMealMutation.mutate({ id, patch }),
    addWater: (ml: number) => addWaterMutation.mutate(ml),
    undoWater: () => lastWater && undoWaterMutation.mutate(lastWater.id),
    loaded: true,
  };
}
