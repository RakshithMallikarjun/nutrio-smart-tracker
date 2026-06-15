import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push-vapid";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/lib/push.functions";

const LS_KEY = "nutrio:reminder-enabled";

export function getRemindersEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_KEY) === "true";
}

export function hasReminderConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_KEY) !== null;
}

export function canReceiveReminders(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  return getRemindersEnabled() && Notification.permission === "granted";
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    // sw.js is registered in __root.tsx on mount
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Ask for notification permission, subscribe to web push, and persist the
 * subscription on the server so the cron job can deliver reminders even when
 * the app is closed.
 */
export async function requestAndEnableReminders(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await getRegistration();
  if (!reg) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (err) {
      console.error("Push subscribe failed", err);
      return false;
    }
  }

  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!sub.endpoint || !p256dh || !auth) return false;

  try {
    await savePushSubscription({
      data: {
        endpoint: sub.endpoint,
        p256dh,
        auth,
        timezone: getTimezone(),
      },
    });
  } catch (err) {
    console.error("Save push subscription failed", err);
    return false;
  }

  localStorage.setItem(LS_KEY, "true");
  return true;
}

export async function disableReminders() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, "false");
  const reg = await getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await deletePushSubscription({ data: { endpoint: sub.endpoint } });
  } catch (err) {
    console.error("Delete push subscription failed", err);
  }
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}

/**
 * Kept for backward compatibility with callers that referenced the old
 * setTimeout-based scheduler. Reminders are now delivered via web push from
 * the server, so this is a no-op.
 */
export function scheduleLocalReminders() {
  /* intentionally empty — reminders are server-side via web push */
}
