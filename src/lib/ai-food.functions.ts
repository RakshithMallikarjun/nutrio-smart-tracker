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

const RECOGNIZE_SYSTEM = `You are a nutrition expert. Given a photo of a food or meal, identify the THREE most likely dishes and estimate nutrition for ONE typical serving of each.
Respond ONLY with a JSON object exactly in this shape, no markdown:
{"candidates":[{"name": string, "serving": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "low"|"medium"|"high"}]}
Order candidates from most to least likely. Use grams or common units for serving. Numbers must be plain numbers (no units).
If the image is not food, return {"candidates":[{"name":"Unknown","serving":"-","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"confidence":"low"}]}.`;

function safeAiError(status: number, body: string): Error {
  console.error(`[AI Gateway] ${status}:`, body.slice(0, 500));
  if (status === 429) return new Error("AI is busy — please try again in a moment.");
  if (status === 402) return new Error("AI credits exhausted. Add credits in workspace settings.");
  return new Error("AI service error — please try again.");
}

const numeric = (v: unknown) => {
  const x = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(x) ? Math.max(0, x) : 0;
};

function normalize(parsed: Partial<RecognizedFood>): RecognizedFood {
  return {
    name: String(parsed.name ?? "Unknown food"),
    serving: String(parsed.serving ?? "1 serving"),
    calories: Math.round(numeric(parsed.calories)),
    protein: Math.round(numeric(parsed.protein)),
    carbs: Math.round(numeric(parsed.carbs)),
    fat: Math.round(numeric(parsed.fat)),
    fiber: Math.round(numeric(parsed.fiber)),
    confidence: (parsed.confidence as RecognizedFood["confidence"]) ?? "medium",
  };
}

export const recognizeFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.imageDataUrl?.startsWith("data:image/")) throw new Error("Invalid image");
    if (data.imageDataUrl.length > 8_000_000) throw new Error("Image too large (max ~6MB)");
    return data;
  })
  .handler(async ({ data }): Promise<{ candidates: RecognizedFood[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service is not configured.");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: RECOGNIZE_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this food. Return the top 3 most likely candidates with confidence." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw safeAiError(resp.status, await resp.text());

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { candidates?: Partial<RecognizedFood>[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const list = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    const candidates = list.slice(0, 3).map(normalize);
    if (candidates.length === 0) {
      candidates.push({
        name: "Unknown food",
        serving: "1 serving",
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
        confidence: "low",
      });
    }
    return { candidates };
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
    if (!key) throw new Error("AI service is not configured.");

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

    if (!resp.ok) throw safeAiError(resp.status, await resp.text());

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
  });

// Estimate macros for a free-text dish name (used when a voice/photo item is
// not in the local DB and we want to offer "Save to My Foods").
const ESTIMATE_SYSTEM = `Given a single dish name, estimate nutrition for ONE typical serving.
Respond ONLY with JSON: {"name": string, "serving": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "low"|"medium"|"high"}.
Numbers must be plain numbers (no units).`;

export const estimateFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => {
    if (!data?.name || typeof data.name !== "string") throw new Error("Invalid name");
    if (data.name.length > 120) throw new Error("Name too long");
    return data;
  })
  .handler(async ({ data }): Promise<RecognizedFood> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service is not configured.");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: ESTIMATE_SYSTEM },
          { role: "user", content: data.name },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw safeAiError(resp.status, await resp.text());

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Partial<RecognizedFood> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    return normalize({ ...parsed, name: parsed.name ?? data.name });
  });
