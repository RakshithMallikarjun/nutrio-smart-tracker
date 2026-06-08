export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Food = {
  id: string;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type MealEntry = Food & { mealType: MealType; loggedAt: string };

export const FOOD_DB: Food[] = [
  { id: "f1", name: "Greek Yogurt Bowl", serving: "1 bowl (200g)", calories: 220, protein: 18, carbs: 24, fat: 6, fiber: 3 },
  { id: "f2", name: "Avocado Toast", serving: "2 slices", calories: 340, protein: 10, carbs: 36, fat: 18, fiber: 8 },
  { id: "f3", name: "Grilled Chicken Salad", serving: "1 plate (350g)", calories: 410, protein: 38, carbs: 22, fat: 18, fiber: 6 },
  { id: "f4", name: "Salmon & Quinoa", serving: "1 portion (300g)", calories: 520, protein: 42, carbs: 38, fat: 22, fiber: 5 },
  { id: "f5", name: "Banana", serving: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3 },
  { id: "f6", name: "Almonds", serving: "1 oz (28g)", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 4 },
  { id: "f7", name: "Oatmeal with Berries", serving: "1 bowl", calories: 280, protein: 9, carbs: 48, fat: 5, fiber: 7 },
  { id: "f8", name: "Protein Smoothie", serving: "1 glass (400ml)", calories: 310, protein: 28, carbs: 32, fat: 6, fiber: 4 },
  { id: "f9", name: "Veggie Stir Fry", serving: "1 plate", calories: 360, protein: 14, carbs: 42, fat: 14, fiber: 9 },
  { id: "f10", name: "Boiled Eggs", serving: "2 eggs", calories: 156, protein: 13, carbs: 1, fat: 11, fiber: 0 },
];

export const DEFAULT_GOALS = {
  calories: 2200,
  protein: 140,
  carbs: 240,
  fat: 70,
  fiber: 30,
  water: 2500, // ml
};

export type Goals = typeof DEFAULT_GOALS;

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: "🥣",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};
