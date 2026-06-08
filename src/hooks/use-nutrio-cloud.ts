import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MealType, Food } from "@/lib/nutrio-data";

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
  const [goals, setGoalsState] = useState<Goals>(DEFAULT_GOALS);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [water, setWater] = useState<{ id: string; quantity_ml: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const date = today();
    const [g, m, w] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("meal_entries").select("*").eq("user_id", userId).eq("log_date", date).order("logged_at", { ascending: true }),
      supabase.from("water_entries").select("id,quantity_ml").eq("user_id", userId).eq("log_date", date),
    ]);
    if (g.data) {
      setGoalsState({
        calories: g.data.calories, protein: g.data.protein, carbs: g.data.carbs,
        fat: g.data.fat, fiber: g.data.fiber, water_ml: g.data.water_ml,
      });
    }
    if (m.data) setMeals(m.data as MealRow[]);
    if (w.data) setWater(w.data);
    setLoaded(true);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addFood = useCallback(async (food: Food, mealType: MealType) => {
    if (!userId) return;
    const { data, error } = await supabase.from("meal_entries").insert({
      user_id: userId,
      food_name: food.name,
      serving: food.serving,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      meal_type: mealType,
    }).select().single();
    if (!error && data) setMeals((prev) => [...prev, data as MealRow]);
  }, [userId]);

  const removeMeal = useCallback(async (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("meal_entries").delete().eq("id", id);
  }, []);

  const addWater = useCallback(async (ml: number) => {
    if (!userId) return;
    const { data } = await supabase.from("water_entries").insert({
      user_id: userId, quantity_ml: ml,
    }).select("id,quantity_ml").single();
    if (data) setWater((prev) => [...prev, data]);
  }, [userId]);

  const undoWater = useCallback(async () => {
    const last = water[water.length - 1];
    if (!last) return;
    setWater((prev) => prev.slice(0, -1));
    await supabase.from("water_entries").delete().eq("id", last.id);
  }, [water]);

  const setGoals = useCallback(async (next: Goals) => {
    if (!userId) return;
    setGoalsState(next);
    await supabase.from("goals").upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
  }, [userId]);

  const totals = meals.reduce(
    (a, m) => ({
      calories: a.calories + Number(m.calories),
      protein: a.protein + Number(m.protein),
      carbs: a.carbs + Number(m.carbs),
      fat: a.fat + Number(m.fat),
      fiber: a.fiber + Number(m.fiber),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const waterTotal = water.reduce((a, b) => a + b.quantity_ml, 0);

  return { goals, setGoals, meals, water, totals, waterTotal, addFood, removeMeal, addWater, undoWater, loaded };
}
