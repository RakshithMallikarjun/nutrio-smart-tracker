import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MEAL_EMOJI, MEAL_LABELS, type MealType } from "@/lib/nutrio-data";
import { getRemindersEnabled } from "@/lib/notifications";
import { track } from "@/lib/analytics";

// Hour-of-day after which we remind a user who hasn't logged that meal.
const MEAL_TIMES: { meal: Exclude<MealType, "snack">; afterHour: number; afterMinute: number }[] = [
  { meal: "breakfast", afterHour: 10, afterMinute: 0 },
  { meal: "lunch", afterHour: 14, afterMinute: 0 },
  { meal: "dinner", afterHour: 20, afterMinute: 0 },
];

const today = () => new Date().toISOString().slice(0, 10);
const skipKey = (meal: string) => `nutrio:reminder-skipped:${today()}:${meal}`;
const shownKey = (meal: string) => `nutrio:reminder-shown:${today()}:${meal}`;

function isPast(h: number, m: number) {
  const now = new Date();
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

type Props = {
  loggedMealTypes: Set<MealType>;
  onLogMeal: (meal: MealType) => void;
};

export function MealReminderPopup({ loggedMealTypes, onLogMeal }: Props) {
  const [dueMeal, setDueMeal] = useState<MealType | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getRemindersEnabled()) return;

    const check = () => {
      for (const { meal, afterHour, afterMinute } of MEAL_TIMES) {
        if (!isPast(afterHour, afterMinute)) continue;
        if (loggedMealTypes.has(meal)) continue;
        if (localStorage.getItem(skipKey(meal)) === "1") continue;
        if (localStorage.getItem(shownKey(meal)) === "1") continue;
        setDueMeal(meal);
        localStorage.setItem(shownKey(meal), "1");
        track("meal_reminder_shown", { meal });
        return;
      }
    };

    // Slight delay so the dashboard data is in place before the first check.
    const initial = setTimeout(check, 1500);
    const interval = setInterval(check, 60 * 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [loggedMealTypes]);

  if (!dueMeal) return null;

  const handleSkip = () => {
    localStorage.setItem(skipKey(dueMeal), "1");
    track("meal_reminder_skipped", { meal: dueMeal });
    setDueMeal(null);
  };

  const handleLog = () => {
    const meal = dueMeal;
    track("meal_reminder_accepted", { meal });
    setDueMeal(null);
    onLogMeal(meal);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">{MEAL_EMOJI[dueMeal]}</span>
            Did you have {MEAL_LABELS[dueMeal].toLowerCase()}?
          </DialogTitle>
          <DialogDescription>
            We noticed you haven't logged {MEAL_LABELS[dueMeal].toLowerCase()} yet today. Want to add it now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            onClick={handleLog}
            className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background"
          >
            Log {MEAL_LABELS[dueMeal].toLowerCase()}
          </button>
          <button
            onClick={handleSkip}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground"
          >
            Skip — already had it
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
