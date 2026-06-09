import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecognizedFood = {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: "low" | "medium" | "high";
};

type Input = { imageDataUrl: string };

const SYSTEM = `You are a nutrition expert. Given a photo of a food or meal, identify the most likely dish and estimate nutrition for ONE typical serving.
Respond ONLY with a JSON object matching this shape exactly, no markdown:
{"name": string, "serving": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "low"|"medium"|"high"}
Use grams or common units for serving. Numbers must be plain numbers (no units).
If the image is not food, return {"name":"Unknown","serving":"-","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"confidence":"low"}.`;

export const recognizeFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.imageDataUrl?.startsWith("data:image/")) {
      throw new Error("Invalid image");
    }
    if (data.imageDataUrl.length > 8_000_000) {
      throw new Error("Image too large (max ~6MB)");
    }
    return data;
  })
  .handler(async ({ data }): Promise<RecognizedFood> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this food and estimate nutrition for one serving." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 429) throw new Error("AI is busy — please try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`AI error ${resp.status}: ${body.slice(0, 200)}`);
    }

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? "";
    let parsed: Partial<RecognizedFood> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const n = (v: unknown) => {
      const x = typeof v === "string" ? parseFloat(v) : Number(v);
      return Number.isFinite(x) ? Math.max(0, x) : 0;
    };

    return {
      name: String(parsed.name ?? "Unknown food"),
      serving: String(parsed.serving ?? "1 serving"),
      calories: Math.round(n(parsed.calories)),
      protein: Math.round(n(parsed.protein)),
      carbs: Math.round(n(parsed.carbs)),
      fat: Math.round(n(parsed.fat)),
      fiber: Math.round(n(parsed.fiber)),
      confidence: (parsed.confidence as RecognizedFood["confidence"]) ?? "medium",
    };
  });

export type ParsedFoodItem = { name: string; quantity: number; unit?: string };

const PARSE_SYSTEM = `You extract food items from a short spoken sentence.
Return ONLY JSON: {"items":[{"name": string, "quantity": number, "unit"?: string}]}.
Rules:
- One item per dish. Combine adjectives ("masala dosa") into name.
- quantity defaults to 1. "a"/"an"/"one" => 1, "two" => 2, etc.
- unit is optional: pieces, cups, ml, g, plate, bowl, slice, glass.
- Lowercase canonical food names ("idli" not "idlies").
- If nothing parseable, return {"items":[]}.`;

export const parseFoodText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { text: string }) => {
    if (!data?.text || typeof data.text !== "string") throw new Error("Invalid text");
    if (data.text.length > 500) throw new Error("Text too long");
    return data;
  })
  .handler(async ({ data }): Promise<{ items: ParsedFoodItem[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: PARSE_SYSTEM },
          { role: "user", content: data.text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 429) throw new Error("AI is busy — try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error ${resp.status}: ${body.slice(0, 200)}`);
    }

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { items?: ParsedFoodItem[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      items: items
        .map((i) => ({
          name: String(i.name ?? "").trim(),
          quantity: Number.isFinite(Number(i.quantity)) ? Math.max(0.25, Number(i.quantity)) : 1,
          unit: i.unit ? String(i.unit).toLowerCase() : undefined,
        }))
        .filter((i) => i.name.length > 0),
    };
