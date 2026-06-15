import { createFileRoute } from "@tanstack/react-router";
import { VAPID_PUBLIC_KEY } from "@/lib/push-vapid";

// Reminder slots — local time in each subscription's timezone
const SLOTS = [
  { key: "breakfast", hour: 8, minute: 0, title: "🥣 Breakfast time!", body: "Don't forget to log your breakfast in Nutrio." },
  { key: "lunch", hour: 13, minute: 0, title: "🥗 Lunch time!", body: "Log your lunch to stay on track with your goals." },
  { key: "snack", hour: 16, minute: 0, title: "🍎 Snack check-in", body: "Had a snack? Tap to log it quickly." },
  { key: "dinner", hour: 19, minute: 30, title: "🍽️ Dinner time!", body: "Time to log your dinner and review your day." },
] as const;

// Cron runs every 5 minutes; fire a slot if local time is within this many minutes after the scheduled moment
const WINDOW_MIN = 10;

type Sub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  last_sent_slot: string | null;
};

function localParts(tz: string, now: Date) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
    };
  } catch {
    return null;
  }
}

function dueSlot(tz: string, now: Date) {
  const p = localParts(tz, now);
  if (!p) return null;
  const cur = p.hour * 60 + p.minute;
  for (const s of SLOTS) {
    const scheduled = s.hour * 60 + s.minute;
    const diff = cur - scheduled;
    if (diff >= 0 && diff <= WINDOW_MIN) {
      return { slot: s, marker: `${p.date}-${s.key}` };
    }
  }
  return null;
}

export const Route = createFileRoute("/api/public/hooks/send-reminders")({
  server: {
    handlers: {
      POST: handler,
      GET: handler,
    },
  },
});

async function handler() {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const subject = process.env.VAPID_SUBJECT ?? "mailto:reminders@nutrio.app";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, privateKey);

  const now = new Date();
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, timezone, last_sent_slot");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const sub of (subs ?? []) as Sub[]) {
    const due = dueSlot(sub.timezone || "UTC", now);
    if (!due) {
      skipped++;
      continue;
    }
    if (sub.last_sent_slot === due.marker) {
      skipped++;
      continue;
    }

    const payload = JSON.stringify({
      title: due.slot.title,
      body: due.slot.body,
      tag: `nutrio-${due.slot.key}`,
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 60 * 30 },
      );
      sent++;
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ last_sent_slot: due.marker, last_sent_at: now.toISOString() })
        .eq("id", sub.id);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string; message?: string };
      // 404/410 = subscription dead — clean it up
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        removed++;
      } else {
        console.error("Push send failed", e.statusCode, e.body ?? e.message);
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, total: subs?.length ?? 0, sent, skipped, removed }),
    { headers: { "Content-Type": "application/json" } },
  );
}
