# Nutrio v1.2 — UX, Navigation & Profile Improvements

A large multi-area release. I'll group into 7 work batches and ship in one pass.

## 1. Food Search Sheet
File: `src/components/nutrio/FoodSearchSheet.tsx`
- Add **X clear button** inside input (only when `q` is non-empty).
- Add **mic button** inside input; on click, open the existing `VoiceLogSheet` flow (lifted state via prop callback `onVoice`) — sheet itself triggers parent to open voice.
- Compact meal selector: active meal = flex-1 pill with emoji + label; inactive meals = fixed 40×40 emoji-only buttons. Remove horizontal scroll.

## 2. Food Database — Western/Global
File: `src/lib/nutrio-data.ts`
- Add `"Global"` to `FOOD_CATEGORIES`.
- Add ~15 Western items: Pizza, Burger, Pasta, Sandwich, Waffles, Pancakes, Oatmeal, Caesar Salad, French Fries, Spaghetti Bolognese, Grilled Chicken, Scrambled Eggs, Bagel, Hot Dog, Greek Yogurt. Each with realistic macros, `diet` tags, source IFCT/USDA.

## 3. Dashboard & Header
File: `src/routes/_authenticated/dashboard.tsx`
- Add Sign Out confirmation `Dialog` (shadcn). Title/message/buttons as spec'd.
- Remove notification badge dot on avatar, Settings link icon, Weekly TrendingUp icon from header.

## 4. Bottom Navigation
File: `src/components/nutrio/BottomNav.tsx`
- Replace `"search"` tab with `"trends"` tab using `TrendingUp` icon.
- Type: `"home" | "trends" | "water" | "profile"`.
- Update dashboard's `BottomNav` handler: on `trends` → `navigate({ to: "/weekly" })`.
- Keep central floating `+` FAB; no duplicates.

## 5. Goals Page
File: `src/routes/_authenticated/goals.tsx`
- Add `showMacros` local state (default false).
- Toggle button "Set macros manually" above sliders.
- Sliders (Calories/Protein/Carbs/Fat/Fiber/Water) rendered only when `showMacros`.

## 6. Trends/Weekly Page — Timeframe
File: `src/routes/_authenticated/weekly.tsx` + `src/components/nutrio/WeeklyCharts.tsx`
- Add segmented control: Daily | Weekly | Monthly (`timeframe` state).
- Query meal_entries with date filter (today / last 7 / last 30 days).
- Bars reflect selected timeframe; goal lines unchanged.

## 7. NutrioLoader + Onboarding Walkthrough
Files: `src/components/nutrio/NutrioLoader.tsx` (new), `src/components/nutrio/Walkthrough.tsx` (new), use on dashboard/goals/weekly initial loads.
- Loader: rotating messages every 1.5s.
- Walkthrough: 5 slides stored in `localStorage("nutrio:onboarded")`. Skip + Next buttons.

## 8. Profile Compact + Diet Filter
- Diet filter already applied in FoodSearchSheet via `useDietPref` + `isAllowed`. Verify VoiceLogSheet AI matching also filters. Tighten goals "About You" grouping (2-col grid).

## 9. Phone/OTP Auth
File: `src/routes/auth.tsx`
- Tabs: Email | Mobile.
- Mobile: country code dropdown defaulting to `+91`, phone input, "Send OTP" → `supabase.auth.signInWithOtp({ phone })`. Then OTP input → `verifyOtp({ phone, token, type: "sms" })`.
- Settings/Profile: "Link phone number" using `supabase.auth.updateUser({ phone })`.
- Note: Supabase Phone provider must be enabled in backend (SMS provider config required by user); UI will surface friendly error if disabled.

## Technical notes
- All edits frontend; no schema changes.
- Use shadcn `Dialog`, `Tabs` for new UI.
- Loader/walkthrough are client-only components, safe under `_authenticated` (already `ssr: false`).
- Phone auth requires Supabase SMS provider configured by the user — I'll note this in the response.

## Out of scope / Deferred
- Actually wiring an SMS provider (Twilio/MessageBird) — user-side config.
- Updating Weekly page charts to handle Daily (single-day bars look odd) — will render as today's per-meal stacked bar.

Estimated 12 files changed/created. Proceeding to implementation upon approval.