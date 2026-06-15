// Minimal local reminder state — used by the in-app meal reminder popup
// and the "Enable reminders" toggle on the Goals page. No browser
// notifications or web push; reminders are shown as in-app dialogs.

const LS_KEY = "nutrio:reminder-enabled";

export function getRemindersEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_KEY) !== "false"; // default ON
}

export function hasReminderConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_KEY) !== null;
}

export function canReceiveReminders(): boolean {
  return getRemindersEnabled();
}

export async function requestAndEnableReminders(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  localStorage.setItem(LS_KEY, "true");
  return true;
}

export function disableReminders() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, "false");
}

export function scheduleLocalReminders() {
  /* no-op: in-app popups replace background reminders */
}
