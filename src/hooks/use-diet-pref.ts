import { useEffect, useState } from "react";
import type { DietPref } from "@/lib/quantity";

const KEY = "nutrio:diet-pref";

export function useDietPref(): [DietPref, (p: DietPref) => void] {
  const [pref, setPref] = useState<DietPref>("any");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(KEY) as DietPref | null;
    if (v) setPref(v);
  }, []);
  const update = (p: DietPref) => {
    setPref(p);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, p);
  };
  return [pref, update];
}
