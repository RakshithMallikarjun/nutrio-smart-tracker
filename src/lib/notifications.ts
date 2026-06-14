// Meal reminder schedule: breakfast 8am, lunch 1pm, snack 4pm, dinner 7:30pm
const REMINDERS = [
  { hour: 8, minute: 0, title: "🥣 Breakfast time!", body: "Don't forget to log your breakfast in Nutrio." },
  { hour: 13, minute: 0, title: "🥗 Lunch time!", body: "Log your lunch to stay on track with your goals." },
  { hour: 16, minute: 0, title: "🍎 Snack check-in", body: "Had a snack? Tap to log it quickly." },
  { hour: 19, minute: 30, title: "🍽️ Dinner time!", body: "Time to log your dinner and review your day." },
];

const LS_KEY = "nutrio:reminder-enabled";
const ALARM_KEY = "nutrio:reminder-alarms";

export function getRemindersEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_KEY) === "true";
}

export async function requestAndEnableReminders(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  localStorage.setItem(LS_KEY, "true");
  scheduleLocalReminders();
  return true;
}

export function disableReminders() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, "false");
  const ids = JSON.parse(localStorage.getItem(ALARM_KEY) ?? "[]") as number[];
  ids.forEach((id) => clearTimeout(id));
  localStorage.removeItem(ALARM_KEY);
}

export function scheduleLocalReminders() {
  if (typeof window === "undefined") return;
  const old = JSON.parse(localStorage.getItem(ALARM_KEY) ?? "[]") as number[];
  old.forEach((id) => clearTimeout(id));

  const ids: number[] = [];
  const now = new Date();

  REMINDERS.forEach((r) => {
    const next = new Date();
    next.setHours(r.hour, r.minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();

    const id = setTimeout(async () => {
      if (!getRemindersEnabled()) return;
      if (Notification.permission === "granted") {
        const swReg = await navigator.serviceWorker.ready.catch(() => null);
        if (swReg) {
          swReg.showNotification(r.title, {
            body: r.body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: `nutrio-${r.hour}`,
            data: { url: "/dashboard" },
          } as NotificationOptions);
        } else {
          new Notification(r.title, { body: r.body, icon: "/icon-192.png" });
        }
      }
      scheduleLocalReminders();
    }, delay) as unknown as number;

    ids.push(id);
  });

  localStorage.setItem(ALARM_KEY, JSON.stringify(ids));
}

// Future reminder helpers — used by upcoming meal/water reminder scheduling
export function hasReminderConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_KEY) !== null;
}

export function canReceiveReminders(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  return getRemindersEnabled() && Notification.permission === "granted";
}

