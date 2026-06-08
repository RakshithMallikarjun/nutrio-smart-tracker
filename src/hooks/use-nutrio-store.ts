import { useEffect, useState, useCallback } from "react";
import { DEFAULT_GOALS, type Goals, type MealEntry, type MealType, type Food } from "@/lib/nutrio-data";

const STORAGE_KEY = "nutrio:v1";

type State = {
  meals: MealEntry[];
  water: number[]; // ml entries today
  goals: Goals;
  date: string; // YYYY-MM-DD
};

const today = () => new Date().toISOString().slice(0, 10);

const initial: State = { meals: [], water: [], goals: DEFAULT_GOALS, date: today() };

function load(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as State;
    // reset daily logs if date changed
    if (parsed.date !== today()) {
      return { ...parsed, meals: [], water: [], date: today() };
    }
    return { ...initial, ...parsed };
  } catch {
    return initial;
  }
}

export function useNutrioStore() {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const addFood = useCallback((food: Food, mealType: MealType) => {
    setState((s) => ({
      ...s,
      meals: [...s.meals, { ...food, mealType, loggedAt: new Date().toISOString() }],
    }));
  }, []);

  const removeMeal = useCallback((index: number) => {
    setState((s) => ({ ...s, meals: s.meals.filter((_, i) => i !== index) }));
  }, []);

  const addWater = useCallback((ml: number) => {
    setState((s) => ({ ...s, water: [...s.water, ml] }));
  }, []);

  const undoWater = useCallback(() => {
    setState((s) => ({ ...s, water: s.water.slice(0, -1) }));
  }, []);

  const setGoals = useCallback((goals: Goals) => {
    setState((s) => ({ ...s, goals }));
  }, []);

  const totals = state.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const waterTotal = state.water.reduce((a, b) => a + b, 0);

  return { ...state, totals, waterTotal, addFood, removeMeal, addWater, undoWater, setGoals };
}
