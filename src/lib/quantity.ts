import type { Food } from "@/lib/nutrio-data";

export type DietTag = "vegan" | "veg" | "egg" | "nonveg";

const NONVEG_RE =
  /\b(chicken|mutton|lamb|beef|pork|fish|prawn|shrimp|crab|seafood|kebab|tikka|keema|biryani.*(chicken|mutton)|gosht|liver|bacon|ham|tuna|salmon)\b/i;
const EGG_RE = /\begg|omelet|omelette|bhurji\b/i;
const DAIRY_RE =
  /\b(milk|paneer|ghee|butter|cheese|curd|yogurt|yoghurt|cream|lassi|kulfi|kheer|rabri|rasgulla|gulab|jalebi|halwa|barfi|peda|chai|coffee)\b/i;

export function inferDiet(name: string, category: string): DietTag {
  const s = `${name} ${category}`;
  if (NONVEG_RE.test(s)) return "nonveg";
  if (EGG_RE.test(s)) return "egg";
  if (DAIRY_RE.test(s)) return "veg";
  return "vegan";
}

// Returns true if a food is allowed under the diet preference.
export function isAllowed(diet: DietTag, pref: DietPref): boolean {
  if (pref === "nonveg") return true;
  if (pref === "egg") return diet !== "nonveg";
  if (pref === "veg") return diet === "veg" || diet === "vegan";
  if (pref === "vegan") return diet === "vegan";
  return true;
}

export type DietPref = "veg" | "egg" | "nonveg" | "vegan" | "any";

// Parse leading quantity from a string. Returns { qty, unit, rest }.
// "2 idlis" -> { qty: 2, rest: "idlis" }
// "250 ml milk" -> { qty: 250, unit: "ml", rest: "milk" }
// "a coffee" -> { qty: 1, rest: "coffee" }
const UNIT_RE =
  /^(ml|millilit(?:re|er)s?|l|litres?|liters?|g|grams?|gms?|kg|kilograms?|cups?|glass(?:es)?|plates?|bowls?|servings?|pieces?|slices?|pcs?)$/i;

const WORD_NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12, half: 0.5,
};

export function parseQty(input: string): { qty: number; unit?: string; rest: string } {
  const tokens = input.trim().split(/\s+/);
  if (!tokens.length) return { qty: 1, rest: input };
  let qty = 1;
  let consumed = 0;
  const first = tokens[0].toLowerCase();
  const num = parseFloat(first);
  if (Number.isFinite(num)) {
    qty = num;
    consumed = 1;
  } else if (WORD_NUM[first] !== undefined) {
    qty = WORD_NUM[first];
    consumed = 1;
  }
  let unit: string | undefined;
  if (tokens[consumed] && UNIT_RE.test(tokens[consumed])) {
    unit = tokens[consumed].toLowerCase();
    consumed++;
  }
  return { qty, unit, rest: tokens.slice(consumed).join(" ").trim() || input };
}

// Try to extract a base serving count from a food.serving string like "2 pieces (100g)".
function baseServingCount(serving: string): number {
  const m = serving.match(/^(\d+(?:\.\d+)?)/);
  return m ? Math.max(1, parseFloat(m[1])) : 1;
}

// Scale a food by a quantity multiplier. quantity is interpreted as "how many
// servings of this food" — UI shows the base serving size.
export function scaleFood(food: Food, qty: number): Food {
  const q = Math.max(0.25, qty);
  const mul = q;
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    ...food,
    serving: `${q}× ${food.serving}`,
    calories: Math.round(food.calories * mul),
    protein: round(food.protein * mul),
    carbs: round(food.carbs * mul),
    fat: round(food.fat * mul),
    fiber: round(food.fiber * mul),
  };
}

// For voice parsing: convert a count like "2 idlis" where base is "2 pieces"
// into the right multiplier (1×) instead of 2× when units match piece counts.
export function smartMultiplier(food: Food, qty: number, unit?: string): number {
  if (!unit || /^(pieces?|pcs?|slices?|servings?|plates?|bowls?|cups?|glass(?:es)?)$/i.test(unit)) {
    const base = baseServingCount(food.serving);
    return qty / base;
  }
  // weight/volume → leave as plain multiplier (1 unit = base serving for MVP)
  return qty;
}
