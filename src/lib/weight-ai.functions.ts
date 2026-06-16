import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = {
  avgCalories: number;
  calorieGoal: number;
  weightChangeKg: number;
  days: number;
  startKg: number;
  endKg: number;
};

const SYSTEM = `You are a friendly nutrition and fitness coach. Given the user's recent weight trend and average calorie intake, write ONE concise insight (2-3 sentences, under 280 characters). Be supportive, specific to the numbers, and end with a practical tip. Respond as plain text only, no markdown.`;

export const generateWeightInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data || typeof data.avgCalories !== "number") throw new Error("Invalid input");
    return data;
  })
  .handler(async ({ data }): Promise<{ insight: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const trend = data.weightChangeKg < -0.2 ? "losing" : data.weightChangeKg > 0.2 ? "gaining" : "plateauing";
    const userMsg = `Trend: ${trend}. Period: last ${data.days} days. Start ${data.startKg.toFixed(1)} kg → End ${data.endKg.toFixed(1)} kg (change ${data.weightChangeKg.toFixed(2)} kg). Average intake ${Math.round(data.avgCalories)} kcal/day vs goal ${data.calorieGoal} kcal/day.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error("[weight-ai]", resp.status, body.slice(0, 300));
      if (resp.status === 429) throw new Error("AI is busy — please try again soon.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error("AI service error.");
    }
    const json = await resp.json();
    const text = String(json?.choices?.[0]?.message?.content ?? "").trim();
    return { insight: text || "Keep logging consistently — more data unlocks better insights." };
  });
