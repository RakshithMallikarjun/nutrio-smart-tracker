// Public VAPID application server key. Safe to ship to the browser.
export const VAPID_PUBLIC_KEY =
  "BLdvSC6unYlR0op7QVCVyQ2tQN3iR6U36z8CQQNdLTH9s6BeShquZGxbbmwO3Kp90DsCVnIwEiG201sxeKsr-y4";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
