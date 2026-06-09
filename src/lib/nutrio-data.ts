import { inferDiet } from "@/lib/quantity";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Food = {
  id: string;
  name: string;
  category: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  source?: string;
  diet?: "vegan" | "veg" | "egg" | "nonveg";
};

export type MealEntry = Food & { mealType: MealType; loggedAt: string };

// Macros sourced from IFCT (Indian Food Composition Tables), USDA FoodData
// Central, and Open Food Facts India. Values are per typical serving.
const RAW: Omit<Food, "id">[] = [
  // ───── South Indian ─────
  { name: "Idli", category: "South Indian", serving: "2 pieces (100g)", calories: 116, protein: 4, carbs: 24, fat: 0.4, fiber: 1.2, source: "IFCT" },
  { name: "Rava Idli", category: "South Indian", serving: "2 pieces (120g)", calories: 180, protein: 5, carbs: 30, fat: 4, fiber: 1.5, source: "IFCT" },
  { name: "Mini Idli", category: "South Indian", serving: "6 pieces (90g)", calories: 105, protein: 3.5, carbs: 22, fat: 0.4, fiber: 1, source: "IFCT" },
  { name: "Dosa", category: "South Indian", serving: "1 medium (80g)", calories: 168, protein: 4, carbs: 29, fat: 4, fiber: 1.3, source: "IFCT" },
  { name: "Masala Dosa", category: "South Indian", serving: "1 piece (150g)", calories: 320, protein: 6, carbs: 50, fat: 10, fiber: 3, source: "IFCT" },
  { name: "Rava Dosa", category: "South Indian", serving: "1 piece (100g)", calories: 250, protein: 5, carbs: 38, fat: 8, fiber: 1.2, source: "IFCT" },
  { name: "Set Dosa", category: "South Indian", serving: "3 pieces (150g)", calories: 280, protein: 6, carbs: 45, fat: 8, fiber: 2, source: "IFCT" },
  { name: "Neer Dosa", category: "South Indian", serving: "2 pieces (100g)", calories: 140, protein: 3, carbs: 26, fat: 2.5, fiber: 1, source: "IFCT" },
  { name: "Onion Dosa", category: "South Indian", serving: "1 piece (100g)", calories: 210, protein: 5, carbs: 32, fat: 7, fiber: 2, source: "IFCT" },
  { name: "Mysore Masala Dosa", category: "South Indian", serving: "1 piece (170g)", calories: 380, protein: 7, carbs: 55, fat: 13, fiber: 3.5, source: "IFCT" },
  { name: "Uttapam", category: "South Indian", serving: "1 piece (120g)", calories: 200, protein: 5, carbs: 32, fat: 6, fiber: 2, source: "IFCT" },
  { name: "Onion Uttapam", category: "South Indian", serving: "1 piece (130g)", calories: 220, protein: 6, carbs: 34, fat: 7, fiber: 2.5, source: "IFCT" },
  { name: "Medu Vada", category: "South Indian", serving: "2 pieces (80g)", calories: 260, protein: 7, carbs: 28, fat: 13, fiber: 3, source: "IFCT" },
  { name: "Sambar", category: "South Indian", serving: "1 cup (200ml)", calories: 130, protein: 6, carbs: 18, fat: 4, fiber: 5, source: "IFCT" },
  { name: "Rasam", category: "South Indian", serving: "1 cup (200ml)", calories: 65, protein: 2, carbs: 10, fat: 2, fiber: 1.5, source: "IFCT" },
  { name: "Pongal", category: "South Indian", serving: "1 cup (200g)", calories: 320, protein: 8, carbs: 50, fat: 9, fiber: 2.5, source: "IFCT" },
  { name: "Ven Pongal", category: "South Indian", serving: "1 cup (200g)", calories: 340, protein: 9, carbs: 48, fat: 12, fiber: 2.5, source: "IFCT" },
  { name: "Khara Bath", category: "South Indian", serving: "1 cup (200g)", calories: 290, protein: 6, carbs: 45, fat: 9, fiber: 3, source: "IFCT" },
  { name: "Kesari Bath", category: "South Indian", serving: "1 cup (180g)", calories: 380, protein: 5, carbs: 60, fat: 13, fiber: 1, source: "IFCT" },
  { name: "Upma", category: "South Indian", serving: "1 cup (200g)", calories: 270, protein: 6, carbs: 42, fat: 8, fiber: 3, source: "IFCT" },
  { name: "Avalakki Upma", category: "South Indian", serving: "1 cup (180g)", calories: 250, protein: 5, carbs: 44, fat: 6, fiber: 2.5, source: "IFCT" },
  { name: "Lemon Rice", category: "South Indian", serving: "1 cup (200g)", calories: 290, protein: 5, carbs: 48, fat: 8, fiber: 2, source: "IFCT" },
  { name: "Tamarind Rice", category: "South Indian", serving: "1 cup (200g)", calories: 310, protein: 5, carbs: 50, fat: 9, fiber: 2.5, source: "IFCT" },
  { name: "Coconut Rice", category: "South Indian", serving: "1 cup (200g)", calories: 340, protein: 5, carbs: 48, fat: 13, fiber: 3, source: "IFCT" },
  { name: "Curd Rice", category: "South Indian", serving: "1 cup (220g)", calories: 240, protein: 7, carbs: 40, fat: 5, fiber: 1.5, source: "IFCT" },
  { name: "Bisibele Bath", category: "South Indian", serving: "1 cup (220g)", calories: 360, protein: 10, carbs: 55, fat: 10, fiber: 5, source: "IFCT" },
  { name: "Puliyogare", category: "South Indian", serving: "1 cup (200g)", calories: 320, protein: 6, carbs: 52, fat: 9, fiber: 3, source: "IFCT" },
  { name: "Ragi Mudde", category: "South Indian", serving: "1 ball (120g)", calories: 220, protein: 5, carbs: 47, fat: 1.5, fiber: 6, source: "IFCT" },
  { name: "Akki Roti", category: "South Indian", serving: "1 piece (100g)", calories: 230, protein: 4, carbs: 38, fat: 7, fiber: 2, source: "IFCT" },
  { name: "Ragi Roti", category: "South Indian", serving: "1 piece (80g)", calories: 175, protein: 4, carbs: 33, fat: 3, fiber: 5, source: "IFCT" },
  { name: "Appam", category: "South Indian", serving: "1 piece (70g)", calories: 130, protein: 2.5, carbs: 25, fat: 2, fiber: 1, source: "IFCT" },
  { name: "Stew (Veg)", category: "South Indian", serving: "1 cup (200ml)", calories: 180, protein: 4, carbs: 14, fat: 12, fiber: 3, source: "IFCT" },
  { name: "Puttu", category: "South Indian", serving: "1 cup (150g)", calories: 210, protein: 4, carbs: 42, fat: 3, fiber: 3, source: "IFCT" },
  { name: "Kadala Curry", category: "South Indian", serving: "1 cup (200g)", calories: 230, protein: 11, carbs: 28, fat: 8, fiber: 8, source: "IFCT" },
  { name: "Pathiri", category: "South Indian", serving: "2 pieces (80g)", calories: 180, protein: 3, carbs: 36, fat: 2, fiber: 1.5, source: "IFCT" },

  // ───── North Indian ─────
  { name: "Chapati", category: "North Indian", serving: "1 piece (40g)", calories: 104, protein: 3.1, carbs: 18, fat: 2.5, fiber: 2.5, source: "IFCT" },
  { name: "Roti", category: "North Indian", serving: "1 piece (40g)", calories: 100, protein: 3, carbs: 18, fat: 2, fiber: 2.5, source: "IFCT" },
  { name: "Tandoori Roti", category: "North Indian", serving: "1 piece (60g)", calories: 150, protein: 5, carbs: 28, fat: 2, fiber: 3, source: "IFCT" },
  { name: "Phulka", category: "North Indian", serving: "1 piece (30g)", calories: 80, protein: 2.5, carbs: 16, fat: 0.5, fiber: 2, source: "IFCT" },
  { name: "Paratha (Plain)", category: "North Indian", serving: "1 piece (70g)", calories: 220, protein: 5, carbs: 30, fat: 9, fiber: 3, source: "IFCT" },
  { name: "Aloo Paratha", category: "North Indian", serving: "1 piece (120g)", calories: 290, protein: 6, carbs: 42, fat: 11, fiber: 4, source: "IFCT" },
  { name: "Gobi Paratha", category: "North Indian", serving: "1 piece (120g)", calories: 270, protein: 6, carbs: 38, fat: 10, fiber: 4, source: "IFCT" },
  { name: "Paneer Paratha", category: "North Indian", serving: "1 piece (130g)", calories: 340, protein: 12, carbs: 38, fat: 15, fiber: 3, source: "IFCT" },
  { name: "Lachha Paratha", category: "North Indian", serving: "1 piece (90g)", calories: 310, protein: 6, carbs: 40, fat: 13, fiber: 2.5, source: "IFCT" },
  { name: "Naan", category: "North Indian", serving: "1 piece (90g)", calories: 260, protein: 8, carbs: 45, fat: 5, fiber: 2, source: "USDA" },
  { name: "Butter Naan", category: "North Indian", serving: "1 piece (100g)", calories: 320, protein: 8, carbs: 45, fat: 11, fiber: 2, source: "USDA" },
  { name: "Kulcha", category: "North Indian", serving: "1 piece (100g)", calories: 290, protein: 7, carbs: 50, fat: 6, fiber: 2, source: "IFCT" },
  { name: "Bhatura", category: "North Indian", serving: "1 piece (100g)", calories: 340, protein: 7, carbs: 45, fat: 14, fiber: 2, source: "IFCT" },
  { name: "Poori", category: "North Indian", serving: "2 pieces (60g)", calories: 240, protein: 4, carbs: 30, fat: 11, fiber: 2, source: "IFCT" },
  { name: "Puri Bhaji", category: "North Indian", serving: "1 plate (250g)", calories: 460, protein: 8, carbs: 60, fat: 20, fiber: 5, source: "IFCT" },
  { name: "Dal Tadka", category: "North Indian", serving: "1 cup (200g)", calories: 200, protein: 11, carbs: 24, fat: 7, fiber: 6, source: "IFCT" },
  { name: "Dal Fry", category: "North Indian", serving: "1 cup (200g)", calories: 220, protein: 11, carbs: 26, fat: 8, fiber: 6, source: "IFCT" },
  { name: "Dal Makhani", category: "North Indian", serving: "1 cup (200g)", calories: 330, protein: 12, carbs: 28, fat: 18, fiber: 8, source: "IFCT" },
  { name: "Rajma", category: "North Indian", serving: "1 cup (200g)", calories: 250, protein: 13, carbs: 35, fat: 6, fiber: 10, source: "IFCT" },
  { name: "Chole", category: "North Indian", serving: "1 cup (200g)", calories: 270, protein: 12, carbs: 36, fat: 8, fiber: 9, source: "IFCT" },
  { name: "Chana Masala", category: "North Indian", serving: "1 cup (200g)", calories: 280, protein: 12, carbs: 38, fat: 8, fiber: 9, source: "IFCT" },
  { name: "Aloo Gobi", category: "North Indian", serving: "1 cup (200g)", calories: 180, protein: 5, carbs: 24, fat: 8, fiber: 5, source: "IFCT" },
  { name: "Bhindi Masala", category: "North Indian", serving: "1 cup (180g)", calories: 170, protein: 4, carbs: 18, fat: 9, fiber: 5, source: "IFCT" },
  { name: "Baingan Bharta", category: "North Indian", serving: "1 cup (200g)", calories: 160, protein: 3, carbs: 14, fat: 10, fiber: 6, source: "IFCT" },
  { name: "Jeera Aloo", category: "North Indian", serving: "1 cup (180g)", calories: 210, protein: 4, carbs: 32, fat: 8, fiber: 4, source: "IFCT" },
  { name: "Mixed Vegetable Curry", category: "North Indian", serving: "1 cup (200g)", calories: 180, protein: 5, carbs: 22, fat: 8, fiber: 6, source: "IFCT" },
  { name: "Paneer Butter Masala", category: "North Indian", serving: "1 cup (200g)", calories: 420, protein: 16, carbs: 18, fat: 32, fiber: 3, source: "IFCT" },
  { name: "Shahi Paneer", category: "North Indian", serving: "1 cup (200g)", calories: 410, protein: 15, carbs: 18, fat: 31, fiber: 3, source: "IFCT" },
  { name: "Kadai Paneer", category: "North Indian", serving: "1 cup (200g)", calories: 380, protein: 16, carbs: 16, fat: 28, fiber: 4, source: "IFCT" },
  { name: "Palak Paneer", category: "North Indian", serving: "1 cup (200g)", calories: 320, protein: 14, carbs: 12, fat: 24, fiber: 5, source: "IFCT" },
  { name: "Matar Paneer", category: "North Indian", serving: "1 cup (200g)", calories: 340, protein: 14, carbs: 20, fat: 22, fiber: 5, source: "IFCT" },
  { name: "Malai Kofta", category: "North Indian", serving: "1 cup (200g)", calories: 450, protein: 12, carbs: 28, fat: 32, fiber: 3, source: "IFCT" },
  { name: "Dum Aloo", category: "North Indian", serving: "1 cup (200g)", calories: 280, protein: 5, carbs: 34, fat: 14, fiber: 4, source: "IFCT" },

  // ───── Rice & Biryani ─────
  { name: "Plain Rice", category: "Rice & Biryani", serving: "1 cup cooked (160g)", calories: 205, protein: 4, carbs: 45, fat: 0.4, fiber: 0.6, source: "USDA" },
  { name: "Steamed Rice", category: "Rice & Biryani", serving: "1 cup cooked (160g)", calories: 200, protein: 4, carbs: 44, fat: 0.4, fiber: 0.6, source: "USDA" },
  { name: "Brown Rice", category: "Rice & Biryani", serving: "1 cup cooked (160g)", calories: 215, protein: 5, carbs: 45, fat: 1.6, fiber: 3.5, source: "USDA" },
  { name: "Jeera Rice", category: "Rice & Biryani", serving: "1 cup (180g)", calories: 270, protein: 5, carbs: 46, fat: 7, fiber: 1, source: "IFCT" },
  { name: "Ghee Rice", category: "Rice & Biryani", serving: "1 cup (180g)", calories: 310, protein: 5, carbs: 46, fat: 11, fiber: 1, source: "IFCT" },
  { name: "Vegetable Pulao", category: "Rice & Biryani", serving: "1 cup (200g)", calories: 290, protein: 6, carbs: 46, fat: 9, fiber: 3, source: "IFCT" },
  { name: "Peas Pulao", category: "Rice & Biryani", serving: "1 cup (200g)", calories: 280, protein: 7, carbs: 48, fat: 7, fiber: 4, source: "IFCT" },
  { name: "Veg Biryani", category: "Rice & Biryani", serving: "1 plate (250g)", calories: 380, protein: 8, carbs: 58, fat: 13, fiber: 4, source: "IFCT" },
  { name: "Chicken Biryani", category: "Rice & Biryani", serving: "1 plate (300g)", calories: 520, protein: 22, carbs: 65, fat: 19, fiber: 3, source: "IFCT" },
  { name: "Mutton Biryani", category: "Rice & Biryani", serving: "1 plate (300g)", calories: 580, protein: 24, carbs: 60, fat: 26, fiber: 3, source: "IFCT" },
  { name: "Egg Biryani", category: "Rice & Biryani", serving: "1 plate (280g)", calories: 460, protein: 16, carbs: 62, fat: 16, fiber: 3, source: "IFCT" },
  { name: "Hyderabadi Biryani", category: "Rice & Biryani", serving: "1 plate (300g)", calories: 560, protein: 22, carbs: 64, fat: 23, fiber: 3, source: "IFCT" },
  { name: "Donne Biryani", category: "Rice & Biryani", serving: "1 plate (300g)", calories: 540, protein: 22, carbs: 62, fat: 22, fiber: 3, source: "IFCT" },
  { name: "Fish Biryani", category: "Rice & Biryani", serving: "1 plate (300g)", calories: 500, protein: 24, carbs: 60, fat: 18, fiber: 3, source: "IFCT" },
  { name: "Fried Rice", category: "Rice & Biryani", serving: "1 cup (200g)", calories: 330, protein: 7, carbs: 50, fat: 11, fiber: 2, source: "USDA" },
  { name: "Schezwan Fried Rice", category: "Rice & Biryani", serving: "1 cup (200g)", calories: 360, protein: 7, carbs: 52, fat: 13, fiber: 2.5, source: "USDA" },

  // ───── Dal & Lentils ─────
  { name: "Toor Dal (cooked)", category: "Dal & Lentils", serving: "1 cup (200g)", calories: 200, protein: 11, carbs: 28, fat: 5, fiber: 7, source: "IFCT" },
  { name: "Moong Dal (cooked)", category: "Dal & Lentils", serving: "1 cup (200g)", calories: 190, protein: 12, carbs: 26, fat: 4, fiber: 8, source: "IFCT" },
  { name: "Masoor Dal (cooked)", category: "Dal & Lentils", serving: "1 cup (200g)", calories: 210, protein: 13, carbs: 28, fat: 5, fiber: 8, source: "IFCT" },
  { name: "Chana Dal (cooked)", category: "Dal & Lentils", serving: "1 cup (200g)", calories: 220, protein: 12, carbs: 30, fat: 5, fiber: 8, source: "IFCT" },
  { name: "Urad Dal (cooked)", category: "Dal & Lentils", serving: "1 cup (200g)", calories: 220, protein: 13, carbs: 28, fat: 6, fiber: 8, source: "IFCT" },

  // ───── Paneer & Veg Protein ─────
  { name: "Paneer", category: "Vegetarian Protein", serving: "100g", calories: 295, protein: 18, carbs: 1.2, fat: 24, fiber: 0, source: "IFCT" },
  { name: "Paneer Bhurji", category: "Vegetarian Protein", serving: "1 cup (180g)", calories: 360, protein: 18, carbs: 8, fat: 28, fiber: 2, source: "IFCT" },
  { name: "Paneer Tikka", category: "Vegetarian Protein", serving: "6 pieces (150g)", calories: 320, protein: 20, carbs: 6, fat: 24, fiber: 1.5, source: "IFCT" },
  { name: "Tofu", category: "Vegetarian Protein", serving: "100g", calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, source: "USDA" },
  { name: "Tofu Bhurji", category: "Vegetarian Protein", serving: "1 cup (180g)", calories: 200, protein: 14, carbs: 9, fat: 12, fiber: 2.5, source: "USDA" },
  { name: "Soy Chunks (cooked)", category: "Vegetarian Protein", serving: "100g", calories: 173, protein: 18, carbs: 9, fat: 7, fiber: 5, source: "USDA" },
  { name: "Soy Nuggets (cooked)", category: "Vegetarian Protein", serving: "100g", calories: 180, protein: 18, carbs: 10, fat: 7, fiber: 5, source: "USDA" },
  { name: "Sprouts Salad", category: "Vegetarian Protein", serving: "1 cup (100g)", calories: 100, protein: 7, carbs: 18, fat: 0.5, fiber: 5, source: "IFCT" },
  { name: "Mixed Sprouts", category: "Vegetarian Protein", serving: "1 cup (100g)", calories: 110, protein: 8, carbs: 18, fat: 0.7, fiber: 5, source: "IFCT" },

  // ───── Chicken ─────
  { name: "Chicken Breast (cooked)", category: "Chicken", serving: "100g", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, source: "USDA" },
  { name: "Grilled Chicken", category: "Chicken", serving: "100g", calories: 175, protein: 30, carbs: 0, fat: 5, fiber: 0, source: "USDA" },
  { name: "Tandoori Chicken", category: "Chicken", serving: "2 pieces (150g)", calories: 280, protein: 35, carbs: 4, fat: 13, fiber: 0.5, source: "IFCT" },
  { name: "Chicken Curry", category: "Chicken", serving: "1 cup (200g)", calories: 290, protein: 22, carbs: 8, fat: 18, fiber: 2, source: "IFCT" },
  { name: "Butter Chicken", category: "Chicken", serving: "1 cup (200g)", calories: 440, protein: 24, carbs: 12, fat: 32, fiber: 1.5, source: "IFCT" },
  { name: "Chicken Tikka", category: "Chicken", serving: "6 pieces (150g)", calories: 270, protein: 32, carbs: 4, fat: 13, fiber: 0.5, source: "IFCT" },
  { name: "Chicken Tikka Masala", category: "Chicken", serving: "1 cup (200g)", calories: 380, protein: 24, carbs: 12, fat: 26, fiber: 2, source: "IFCT" },
  { name: "Chicken Chettinad", category: "Chicken", serving: "1 cup (200g)", calories: 350, protein: 26, carbs: 10, fat: 22, fiber: 2, source: "IFCT" },
  { name: "Chicken Sukka", category: "Chicken", serving: "1 cup (180g)", calories: 320, protein: 28, carbs: 8, fat: 20, fiber: 2, source: "IFCT" },
  { name: "Chicken Kebab", category: "Chicken", serving: "4 pieces (120g)", calories: 250, protein: 26, carbs: 4, fat: 14, fiber: 0.5, source: "IFCT" },
  { name: "Chicken Fried Rice", category: "Chicken", serving: "1 cup (200g)", calories: 380, protein: 16, carbs: 48, fat: 13, fiber: 2, source: "USDA" },

  // ───── Fish & Seafood ─────
  { name: "Fish Curry", category: "Fish & Seafood", serving: "1 cup (200g)", calories: 230, protein: 22, carbs: 6, fat: 13, fiber: 1.5, source: "IFCT" },
  { name: "Fish Fry", category: "Fish & Seafood", serving: "2 pieces (120g)", calories: 290, protein: 24, carbs: 8, fat: 18, fiber: 0.5, source: "IFCT" },
  { name: "Grilled Fish", category: "Fish & Seafood", serving: "100g", calories: 160, protein: 26, carbs: 0, fat: 6, fiber: 0, source: "USDA" },
  { name: "Prawn Curry", category: "Fish & Seafood", serving: "1 cup (200g)", calories: 250, protein: 22, carbs: 8, fat: 14, fiber: 1.5, source: "IFCT" },
  { name: "Prawn Fry", category: "Fish & Seafood", serving: "100g", calories: 230, protein: 22, carbs: 6, fat: 13, fiber: 0.5, source: "IFCT" },
  { name: "Crab Curry", category: "Fish & Seafood", serving: "1 cup (200g)", calories: 240, protein: 22, carbs: 8, fat: 13, fiber: 1.5, source: "IFCT" },

  // ───── Eggs ─────
  { name: "Boiled Egg", category: "Egg", serving: "1 large (50g)", calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, source: "USDA" },
  { name: "Egg White", category: "Egg", serving: "1 large (33g)", calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1, fiber: 0, source: "USDA" },
  { name: "Omelette (2 egg)", category: "Egg", serving: "2 eggs", calories: 200, protein: 13, carbs: 1, fat: 16, fiber: 0, source: "USDA" },
  { name: "Masala Omelette", category: "Egg", serving: "2 eggs", calories: 230, protein: 14, carbs: 4, fat: 18, fiber: 1, source: "IFCT" },
  { name: "Egg Bhurji", category: "Egg", serving: "2 eggs", calories: 240, protein: 14, carbs: 5, fat: 18, fiber: 1.5, source: "IFCT" },
  { name: "Egg Curry", category: "Egg", serving: "1 cup (200g) 2 eggs", calories: 320, protein: 16, carbs: 10, fat: 24, fiber: 2, source: "IFCT" },
  { name: "Half Boiled Egg", category: "Egg", serving: "1 large", calories: 80, protein: 6.3, carbs: 0.6, fat: 5.5, fiber: 0, source: "USDA" },

  // ───── Healthy Breakfast ─────
  { name: "Oats (cooked)", category: "Breakfast", serving: "1 cup (240g)", calories: 160, protein: 6, carbs: 28, fat: 3, fiber: 4, source: "USDA" },
  { name: "Oats Upma", category: "Breakfast", serving: "1 cup (200g)", calories: 240, protein: 8, carbs: 36, fat: 7, fiber: 5, source: "IFCT" },
  { name: "Overnight Oats", category: "Breakfast", serving: "1 cup (250g)", calories: 290, protein: 10, carbs: 42, fat: 8, fiber: 6, source: "USDA" },
  { name: "Muesli", category: "Breakfast", serving: "50g + 200ml milk", calories: 310, protein: 11, carbs: 50, fat: 7, fiber: 5, source: "OpenFoodFacts" },
  { name: "Cornflakes", category: "Breakfast", serving: "30g + 200ml milk", calories: 220, protein: 9, carbs: 38, fat: 4, fiber: 1.2, source: "USDA" },
  { name: "Granola", category: "Breakfast", serving: "50g", calories: 220, protein: 5, carbs: 32, fat: 8, fiber: 4, source: "USDA" },
  { name: "Peanut Butter Toast", category: "Breakfast", serving: "2 slices", calories: 290, protein: 11, carbs: 30, fat: 14, fiber: 4, source: "USDA" },
  { name: "Multigrain Bread", category: "Breakfast", serving: "2 slices (60g)", calories: 160, protein: 6, carbs: 28, fat: 2.5, fiber: 4, source: "OpenFoodFacts" },
  { name: "Whole Wheat Bread", category: "Breakfast", serving: "2 slices (60g)", calories: 150, protein: 6, carbs: 27, fat: 2, fiber: 4, source: "USDA" },

  // ───── Indian Snacks ─────
  { name: "Poha", category: "Indian Snacks", serving: "1 cup (180g)", calories: 250, protein: 5, carbs: 44, fat: 6, fiber: 2.5, source: "IFCT" },
  { name: "Kanda Poha", category: "Indian Snacks", serving: "1 cup (180g)", calories: 270, protein: 5, carbs: 46, fat: 7, fiber: 3, source: "IFCT" },
  { name: "Dhokla", category: "Indian Snacks", serving: "4 pieces (120g)", calories: 200, protein: 7, carbs: 32, fat: 5, fiber: 3, source: "IFCT" },
  { name: "Khaman Dhokla", category: "Indian Snacks", serving: "4 pieces (120g)", calories: 210, protein: 8, carbs: 30, fat: 6, fiber: 3, source: "IFCT" },
  { name: "Bhel Puri", category: "Indian Snacks", serving: "1 plate (150g)", calories: 280, protein: 6, carbs: 44, fat: 9, fiber: 4, source: "IFCT" },
  { name: "Sev Puri", category: "Indian Snacks", serving: "6 pieces (140g)", calories: 310, protein: 6, carbs: 42, fat: 13, fiber: 3.5, source: "IFCT" },
  { name: "Pani Puri", category: "Indian Snacks", serving: "6 pieces (120g)", calories: 220, protein: 4, carbs: 36, fat: 7, fiber: 3, source: "IFCT" },
  { name: "Samosa", category: "Indian Snacks", serving: "1 piece (60g)", calories: 175, protein: 3, carbs: 22, fat: 9, fiber: 2, source: "IFCT" },
  { name: "Kachori", category: "Indian Snacks", serving: "1 piece (50g)", calories: 200, protein: 4, carbs: 22, fat: 11, fiber: 2, source: "IFCT" },
  { name: "Pav Bhaji", category: "Indian Snacks", serving: "1 plate (300g)", calories: 480, protein: 10, carbs: 60, fat: 22, fiber: 7, source: "IFCT" },
  { name: "Vada Pav", category: "Indian Snacks", serving: "1 piece (150g)", calories: 310, protein: 7, carbs: 42, fat: 13, fiber: 4, source: "IFCT" },
  { name: "Misal Pav", category: "Indian Snacks", serving: "1 plate (300g)", calories: 420, protein: 14, carbs: 52, fat: 17, fiber: 9, source: "IFCT" },
  { name: "Aloo Bonda", category: "Indian Snacks", serving: "2 pieces (100g)", calories: 240, protein: 4, carbs: 30, fat: 12, fiber: 2.5, source: "IFCT" },
  { name: "Mirchi Bajji", category: "Indian Snacks", serving: "2 pieces (90g)", calories: 220, protein: 4, carbs: 24, fat: 12, fiber: 2.5, source: "IFCT" },
  { name: "Pakora", category: "Indian Snacks", serving: "6 pieces (100g)", calories: 260, protein: 6, carbs: 26, fat: 14, fiber: 3, source: "IFCT" },
  { name: "Onion Pakora", category: "Indian Snacks", serving: "6 pieces (100g)", calories: 270, protein: 6, carbs: 26, fat: 15, fiber: 3, source: "IFCT" },
  { name: "Banana Chips", category: "Indian Snacks", serving: "30g", calories: 160, protein: 0.7, carbs: 17, fat: 10, fiber: 2, source: "IFCT" },
  { name: "Murukku", category: "Indian Snacks", serving: "30g", calories: 150, protein: 3, carbs: 18, fat: 7, fiber: 1.5, source: "IFCT" },
  { name: "Chakli", category: "Indian Snacks", serving: "30g", calories: 155, protein: 3, carbs: 17, fat: 8, fiber: 1.5, source: "IFCT" },

  // ───── Street Food ─────
  { name: "Dahi Puri", category: "Street Food", serving: "6 pieces (140g)", calories: 280, protein: 7, carbs: 38, fat: 11, fiber: 3, source: "IFCT" },
  { name: "Ragda Pattice", category: "Street Food", serving: "1 plate (250g)", calories: 380, protein: 11, carbs: 52, fat: 14, fiber: 8, source: "IFCT" },
  { name: "Kathi Roll", category: "Street Food", serving: "1 piece (200g)", calories: 380, protein: 14, carbs: 42, fat: 17, fiber: 3, source: "IFCT" },
  { name: "Frankie", category: "Street Food", serving: "1 piece (200g)", calories: 370, protein: 12, carbs: 44, fat: 16, fiber: 3, source: "IFCT" },
  { name: "Momos (Veg)", category: "Street Food", serving: "6 pieces (150g)", calories: 280, protein: 7, carbs: 48, fat: 6, fiber: 3, source: "OpenFoodFacts" },
  { name: "Momos (Chicken)", category: "Street Food", serving: "6 pieces (150g)", calories: 320, protein: 14, carbs: 44, fat: 9, fiber: 2, source: "OpenFoodFacts" },

  // ───── Fruits ─────
  { name: "Apple", category: "Fruit", serving: "1 medium (180g)", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, source: "USDA" },
  { name: "Banana", category: "Fruit", serving: "1 medium (118g)", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, source: "USDA" },
  { name: "Mango", category: "Fruit", serving: "1 cup sliced (165g)", calories: 99, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, source: "USDA" },
  { name: "Papaya", category: "Fruit", serving: "1 cup (140g)", calories: 60, protein: 0.7, carbs: 15, fat: 0.4, fiber: 2.5, source: "USDA" },
  { name: "Watermelon", category: "Fruit", serving: "1 cup (150g)", calories: 46, protein: 0.9, carbs: 12, fat: 0.2, fiber: 0.6, source: "USDA" },
  { name: "Muskmelon", category: "Fruit", serving: "1 cup (160g)", calories: 54, protein: 1.3, carbs: 13, fat: 0.3, fiber: 1.4, source: "USDA" },
  { name: "Orange", category: "Fruit", serving: "1 medium (130g)", calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, source: "USDA" },
  { name: "Sweet Lime", category: "Fruit", serving: "1 medium (110g)", calories: 50, protein: 0.8, carbs: 13, fat: 0.1, fiber: 1.9, source: "IFCT" },
  { name: "Pineapple", category: "Fruit", serving: "1 cup (165g)", calories: 82, protein: 0.9, carbs: 22, fat: 0.2, fiber: 2.3, source: "USDA" },
  { name: "Guava", category: "Fruit", serving: "1 medium (100g)", calories: 68, protein: 2.6, carbs: 14, fat: 1, fiber: 5.4, source: "USDA" },
  { name: "Pomegranate", category: "Fruit", serving: "1 cup arils (174g)", calories: 144, protein: 2.9, carbs: 33, fat: 2, fiber: 7, source: "USDA" },
  { name: "Grapes", category: "Fruit", serving: "1 cup (150g)", calories: 104, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, source: "USDA" },
  { name: "Sapota (Chikoo)", category: "Fruit", serving: "1 medium (100g)", calories: 83, protein: 0.4, carbs: 20, fat: 1.1, fiber: 5.3, source: "IFCT" },
  { name: "Jackfruit", category: "Fruit", serving: "1 cup (165g)", calories: 155, protein: 2.8, carbs: 40, fat: 0.5, fiber: 2.6, source: "USDA" },
  { name: "Custard Apple", category: "Fruit", serving: "1 medium (130g)", calories: 130, protein: 2.3, carbs: 32, fat: 0.5, fiber: 6, source: "IFCT" },
  { name: "Dragon Fruit", category: "Fruit", serving: "1 cup (180g)", calories: 102, protein: 2, carbs: 22, fat: 0, fiber: 5, source: "USDA" },
  { name: "Kiwi", category: "Fruit", serving: "1 medium (70g)", calories: 42, protein: 0.8, carbs: 10, fat: 0.4, fiber: 2.1, source: "USDA" },

  // ───── Vegetables ─────
  { name: "Potato (boiled)", category: "Vegetable", serving: "1 medium (150g)", calories: 130, protein: 3, carbs: 30, fat: 0.2, fiber: 2.5, source: "USDA" },
  { name: "Sweet Potato (boiled)", category: "Vegetable", serving: "1 medium (130g)", calories: 112, protein: 2, carbs: 26, fat: 0.1, fiber: 3.9, source: "USDA" },
  { name: "Onion", category: "Vegetable", serving: "1 medium (110g)", calories: 44, protein: 1.2, carbs: 10, fat: 0.1, fiber: 1.9, source: "USDA" },
  { name: "Tomato", category: "Vegetable", serving: "1 medium (123g)", calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5, source: "USDA" },
  { name: "Cucumber", category: "Vegetable", serving: "1 cup (104g)", calories: 16, protein: 0.7, carbs: 3.8, fat: 0.1, fiber: 0.5, source: "USDA" },
  { name: "Carrot", category: "Vegetable", serving: "1 medium (61g)", calories: 25, protein: 0.6, carbs: 6, fat: 0.1, fiber: 1.7, source: "USDA" },
  { name: "Beetroot", category: "Vegetable", serving: "1 cup (136g)", calories: 58, protein: 2.2, carbs: 13, fat: 0.2, fiber: 3.8, source: "USDA" },
  { name: "Radish", category: "Vegetable", serving: "1 cup sliced (116g)", calories: 19, protein: 0.8, carbs: 4, fat: 0.1, fiber: 1.9, source: "USDA" },
  { name: "Spinach (cooked)", category: "Vegetable", serving: "1 cup (180g)", calories: 41, protein: 5.3, carbs: 6.8, fat: 0.5, fiber: 4.3, source: "USDA" },
  { name: "Fenugreek Leaves (cooked)", category: "Vegetable", serving: "1 cup (100g)", calories: 49, protein: 4.4, carbs: 6, fat: 0.9, fiber: 3.5, source: "IFCT" },
  { name: "Cabbage (cooked)", category: "Vegetable", serving: "1 cup (150g)", calories: 34, protein: 2, carbs: 8, fat: 0.1, fiber: 2.9, source: "USDA" },
  { name: "Cauliflower (cooked)", category: "Vegetable", serving: "1 cup (124g)", calories: 29, protein: 2.3, carbs: 5, fat: 0.6, fiber: 2.9, source: "USDA" },
  { name: "Broccoli (cooked)", category: "Vegetable", serving: "1 cup (156g)", calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, source: "USDA" },
  { name: "Green Beans (cooked)", category: "Vegetable", serving: "1 cup (125g)", calories: 44, protein: 2.4, carbs: 10, fat: 0.4, fiber: 4, source: "USDA" },
  { name: "Capsicum", category: "Vegetable", serving: "1 medium (120g)", calories: 30, protein: 1.2, carbs: 7, fat: 0.3, fiber: 2.5, source: "USDA" },
  { name: "Pumpkin (cooked)", category: "Vegetable", serving: "1 cup (245g)", calories: 49, protein: 1.8, carbs: 12, fat: 0.2, fiber: 2.7, source: "USDA" },
  { name: "Bottle Gourd (cooked)", category: "Vegetable", serving: "1 cup (146g)", calories: 22, protein: 0.9, carbs: 5.4, fat: 0.1, fiber: 2, source: "IFCT" },
  { name: "Ridge Gourd (cooked)", category: "Vegetable", serving: "1 cup (146g)", calories: 25, protein: 1.2, carbs: 5.6, fat: 0.2, fiber: 2.2, source: "IFCT" },
  { name: "Bitter Gourd (cooked)", category: "Vegetable", serving: "1 cup (140g)", calories: 24, protein: 1, carbs: 5.4, fat: 0.2, fiber: 2.6, source: "IFCT" },
  { name: "Drumstick (cooked)", category: "Vegetable", serving: "1 cup (100g)", calories: 37, protein: 2.1, carbs: 8.5, fat: 0.2, fiber: 3.2, source: "IFCT" },

  // ───── Dairy ─────
  { name: "Milk (full fat)", category: "Dairy", serving: "1 cup (240ml)", calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0, source: "USDA" },
  { name: "Toned Milk", category: "Dairy", serving: "1 cup (240ml)", calories: 120, protein: 8, carbs: 12, fat: 4.5, fiber: 0, source: "IFCT" },
  { name: "Skim Milk", category: "Dairy", serving: "1 cup (240ml)", calories: 83, protein: 8.3, carbs: 12, fat: 0.2, fiber: 0, source: "USDA" },
  { name: "Curd", category: "Dairy", serving: "1 cup (245g)", calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0, source: "IFCT" },
  { name: "Yogurt", category: "Dairy", serving: "1 cup (245g)", calories: 154, protein: 13, carbs: 17, fat: 4, fiber: 0, source: "USDA" },
  { name: "Greek Yogurt", category: "Dairy", serving: "1 cup (245g)", calories: 220, protein: 22, carbs: 9, fat: 11, fiber: 0, source: "USDA" },
  { name: "Buttermilk", category: "Dairy", serving: "1 glass (250ml)", calories: 75, protein: 4, carbs: 8, fat: 3, fiber: 0, source: "IFCT" },
  { name: "Lassi (sweet)", category: "Dairy", serving: "1 glass (250ml)", calories: 220, protein: 6, carbs: 32, fat: 8, fiber: 0, source: "IFCT" },
  { name: "Cheese", category: "Dairy", serving: "1 slice (30g)", calories: 113, protein: 7, carbs: 0.4, fat: 9, fiber: 0, source: "USDA" },
  { name: "Butter", category: "Dairy", serving: "1 tbsp (14g)", calories: 102, protein: 0.1, carbs: 0, fat: 11.5, fiber: 0, source: "USDA" },
  { name: "Ghee", category: "Dairy", serving: "1 tbsp (14g)", calories: 124, protein: 0, carbs: 0, fat: 14, fiber: 0, source: "IFCT" },

  // ───── Nuts & Seeds ─────
  { name: "Almonds", category: "Nuts & Seeds", serving: "28g (~23 pcs)", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, source: "USDA" },
  { name: "Cashews", category: "Nuts & Seeds", serving: "28g (~18 pcs)", calories: 157, protein: 5, carbs: 9, fat: 12, fiber: 0.9, source: "USDA" },
  { name: "Walnuts", category: "Nuts & Seeds", serving: "28g (~14 halves)", calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9, source: "USDA" },
  { name: "Pistachios", category: "Nuts & Seeds", serving: "28g (~49 pcs)", calories: 159, protein: 5.7, carbs: 8, fat: 13, fiber: 3, source: "USDA" },
  { name: "Peanuts", category: "Nuts & Seeds", serving: "28g", calories: 161, protein: 7, carbs: 4.6, fat: 14, fiber: 2.4, source: "USDA" },
  { name: "Peanut Butter", category: "Nuts & Seeds", serving: "1 tbsp (16g)", calories: 94, protein: 4, carbs: 3, fat: 8, fiber: 1, source: "USDA" },
  { name: "Chia Seeds", category: "Nuts & Seeds", serving: "1 tbsp (12g)", calories: 60, protein: 2, carbs: 5, fat: 4, fiber: 4, source: "USDA" },
  { name: "Flax Seeds", category: "Nuts & Seeds", serving: "1 tbsp (10g)", calories: 55, protein: 1.9, carbs: 3, fat: 4.3, fiber: 2.8, source: "USDA" },
  { name: "Pumpkin Seeds", category: "Nuts & Seeds", serving: "28g", calories: 158, protein: 9, carbs: 3, fat: 14, fiber: 1.7, source: "USDA" },
  { name: "Sunflower Seeds", category: "Nuts & Seeds", serving: "28g", calories: 165, protein: 6, carbs: 6, fat: 14, fiber: 3, source: "USDA" },

  // ───── Beverages ─────
  { name: "Black Coffee", category: "Beverage", serving: "1 cup (240ml)", calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, source: "USDA" },
  { name: "Milk Coffee", category: "Beverage", serving: "1 cup (200ml)", calories: 80, protein: 4, carbs: 10, fat: 3, fiber: 0, source: "IFCT" },
  { name: "Filter Coffee", category: "Beverage", serving: "1 cup (180ml)", calories: 90, protein: 3, carbs: 12, fat: 3, fiber: 0, source: "IFCT" },
  { name: "Tea", category: "Beverage", serving: "1 cup (200ml)", calories: 60, protein: 2, carbs: 8, fat: 2.5, fiber: 0, source: "IFCT" },
  { name: "Masala Tea", category: "Beverage", serving: "1 cup (200ml)", calories: 80, protein: 3, carbs: 10, fat: 3, fiber: 0, source: "IFCT" },
  { name: "Green Tea", category: "Beverage", serving: "1 cup (240ml)", calories: 2, protein: 0.5, carbs: 0.5, fat: 0, fiber: 0, source: "USDA" },
  { name: "Lemon Tea", category: "Beverage", serving: "1 cup (240ml)", calories: 30, protein: 0.2, carbs: 7, fat: 0, fiber: 0, source: "IFCT" },
  { name: "Coconut Water", category: "Beverage", serving: "1 cup (240ml)", calories: 46, protein: 1.7, carbs: 9, fat: 0.5, fiber: 2.6, source: "USDA" },
  { name: "Sugarcane Juice", category: "Beverage", serving: "1 glass (250ml)", calories: 180, protein: 0.4, carbs: 45, fat: 0, fiber: 0, source: "IFCT" },
  { name: "Fresh Lime Soda", category: "Beverage", serving: "1 glass (250ml)", calories: 70, protein: 0.1, carbs: 18, fat: 0, fiber: 0.2, source: "IFCT" },

  // ───── Protein Supplements ─────
  { name: "Whey Protein", category: "Supplement", serving: "1 scoop (30g)", calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, source: "OpenFoodFacts" },
  { name: "Whey Isolate", category: "Supplement", serving: "1 scoop (30g)", calories: 110, protein: 27, carbs: 1, fat: 0.5, fiber: 0, source: "OpenFoodFacts" },
  { name: "Plant Protein", category: "Supplement", serving: "1 scoop (30g)", calories: 120, protein: 22, carbs: 4, fat: 2, fiber: 2, source: "OpenFoodFacts" },
  { name: "Mass Gainer", category: "Supplement", serving: "1 scoop (100g)", calories: 380, protein: 25, carbs: 60, fat: 4, fiber: 1, source: "OpenFoodFacts" },
  { name: "Casein Protein", category: "Supplement", serving: "1 scoop (30g)", calories: 120, protein: 24, carbs: 3, fat: 1, fiber: 0, source: "OpenFoodFacts" },

  // ───── Packaged — Dairy ─────
  { name: "Amul Milk", category: "Packaged — Dairy", serving: "1 cup (200ml)", calories: 130, protein: 6.4, carbs: 9.4, fat: 7, fiber: 0, source: "OpenFoodFacts" },
  { name: "Amul Paneer", category: "Packaged — Dairy", serving: "100g", calories: 292, protein: 19, carbs: 6, fat: 22, fiber: 0, source: "OpenFoodFacts" },
  { name: "Amul Butter", category: "Packaged — Dairy", serving: "1 tbsp (10g)", calories: 73, protein: 0, carbs: 0, fat: 8.1, fiber: 0, source: "OpenFoodFacts" },
  { name: "Amul Cheese", category: "Packaged — Dairy", serving: "1 slice (20g)", calories: 64, protein: 4, carbs: 0.3, fat: 5.2, fiber: 0, source: "OpenFoodFacts" },
  { name: "Mother Dairy Milk", category: "Packaged — Dairy", serving: "1 cup (200ml)", calories: 125, protein: 6.4, carbs: 9.4, fat: 6.5, fiber: 0, source: "OpenFoodFacts" },

  // ───── Packaged — Biscuits ─────
  { name: "Parle G", category: "Packaged — Biscuits", serving: "5 biscuits (28g)", calories: 130, protein: 2, carbs: 22, fat: 4, fiber: 0.5, source: "OpenFoodFacts" },
  { name: "Good Day", category: "Packaged — Biscuits", serving: "4 biscuits (35g)", calories: 175, protein: 2.5, carbs: 22, fat: 8, fiber: 0.5, source: "OpenFoodFacts" },
  { name: "Marie Gold", category: "Packaged — Biscuits", serving: "4 biscuits (24g)", calories: 110, protein: 2, carbs: 19, fat: 3, fiber: 0.5, source: "OpenFoodFacts" },
  { name: "Bourbon", category: "Packaged — Biscuits", serving: "2 biscuits (30g)", calories: 150, protein: 1.8, carbs: 22, fat: 6, fiber: 0.6, source: "OpenFoodFacts" },
  { name: "Monaco", category: "Packaged — Biscuits", serving: "5 biscuits (30g)", calories: 145, protein: 2.5, carbs: 20, fat: 6, fiber: 0.4, source: "OpenFoodFacts" },

  // ───── Packaged — Instant Foods ─────
  { name: "Maggi Noodles", category: "Packaged — Instant", serving: "1 pack (70g)", calories: 310, protein: 7, carbs: 42, fat: 12, fiber: 2, source: "OpenFoodFacts" },
  { name: "Yippee Noodles", category: "Packaged — Instant", serving: "1 pack (70g)", calories: 320, protein: 7, carbs: 43, fat: 13, fiber: 2, source: "OpenFoodFacts" },
  { name: "Cup Noodles", category: "Packaged — Instant", serving: "1 cup (70g)", calories: 290, protein: 6, carbs: 40, fat: 11, fiber: 2, source: "OpenFoodFacts" },

  // ───── Packaged — Beverages ─────
  { name: "Coca Cola", category: "Packaged — Beverage", serving: "1 can (330ml)", calories: 139, protein: 0, carbs: 35, fat: 0, fiber: 0, source: "OpenFoodFacts" },
  { name: "Pepsi", category: "Packaged — Beverage", serving: "1 can (330ml)", calories: 138, protein: 0, carbs: 36, fat: 0, fiber: 0, source: "OpenFoodFacts" },
  { name: "Thums Up", category: "Packaged — Beverage", serving: "1 can (330ml)", calories: 145, protein: 0, carbs: 37, fat: 0, fiber: 0, source: "OpenFoodFacts" },
  { name: "Sprite", category: "Packaged — Beverage", serving: "1 can (330ml)", calories: 132, protein: 0, carbs: 33, fat: 0, fiber: 0, source: "OpenFoodFacts" },
  { name: "Fanta", category: "Packaged — Beverage", serving: "1 can (330ml)", calories: 158, protein: 0, carbs: 40, fat: 0, fiber: 0, source: "OpenFoodFacts" },
  { name: "Red Bull", category: "Packaged — Beverage", serving: "1 can (250ml)", calories: 110, protein: 1, carbs: 28, fat: 0, fiber: 0, source: "OpenFoodFacts" },

  // ───── Packaged — Snacks ─────
  { name: "Lay's Chips", category: "Packaged — Snacks", serving: "1 pack (52g)", calories: 280, protein: 3, carbs: 30, fat: 17, fiber: 1.5, source: "OpenFoodFacts" },
  { name: "Bingo Chips", category: "Packaged — Snacks", serving: "1 pack (52g)", calories: 285, protein: 3, carbs: 31, fat: 17, fiber: 1.5, source: "OpenFoodFacts" },
  { name: "Kurkure", category: "Packaged — Snacks", serving: "1 pack (45g)", calories: 240, protein: 3, carbs: 26, fat: 14, fiber: 1.5, source: "OpenFoodFacts" },
  { name: "Haldiram Bhujia", category: "Packaged — Snacks", serving: "30g", calories: 165, protein: 4, carbs: 12, fat: 11, fiber: 2, source: "OpenFoodFacts" },
  { name: "Balaji Chips", category: "Packaged — Snacks", serving: "1 pack (50g)", calories: 270, protein: 3, carbs: 30, fat: 16, fiber: 1.5, source: "OpenFoodFacts" },

  // ───── Packaged — Breakfast ─────
  { name: "Kellogg's Corn Flakes", category: "Packaged — Breakfast", serving: "30g + 200ml milk", calories: 220, protein: 9, carbs: 38, fat: 4, fiber: 1, source: "OpenFoodFacts" },
  { name: "Kellogg's Muesli", category: "Packaged — Breakfast", serving: "50g + 200ml milk", calories: 320, protein: 11, carbs: 51, fat: 7, fiber: 5, source: "OpenFoodFacts" },
  { name: "Quaker Oats", category: "Packaged — Breakfast", serving: "40g (dry)", calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, source: "OpenFoodFacts" },
];

import { inferDiet } from "@/lib/quantity";

export const FOOD_DB: Food[] = RAW.map((f, i) => ({
  id: `f${i + 1}`,
  ...f,
  diet: inferDiet(f.name, f.category),
}));

export const FOOD_CATEGORIES: string[] = Array.from(new Set(FOOD_DB.map((f) => f.category)));

// Fuzzy lookup for voice / AI / barcode flows.
export function findFood(name: string): Food | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  let best: { f: Food; score: number } | undefined;
  for (const f of FOOD_DB) {
    const n = f.name.toLowerCase();
    let score = 0;
    if (n === q) score = 100;
    else if (n.includes(q) || q.includes(n)) score = 60 + Math.min(n.length, q.length);
    else {
      const words = q.split(/\s+/);
      const hits = words.filter((w) => w.length > 2 && n.includes(w)).length;
      score = hits * 10;
    }
    if (score > 0 && (!best || score > best.score)) best = { f, score };
  }
  return best && best.score >= 20 ? best.f : undefined;
}

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
