import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { requestAndEnableReminders } from "@/lib/notifications";
import { track } from "@/lib/analytics";

export function ReminderConsentModal({ userId }: { userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("notifications_prompt_completed")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data || !data.notifications_prompt_completed) setOpen(true);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const finish = async (enabled: boolean) => {
    if (!userId) return;
    await supabase.from("profiles").upsert({
      id: userId,
      notifications_enabled: enabled,
      notifications_prompt_completed: true,
      notification_consent_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const enable = async () => {
    setLoading(true);
    try {
      const granted = await requestAndEnableReminders();
      await finish(granted);
      track("reminder_consent", { enabled: granted });
      if (granted) toast.success("✅ Meal reminders enabled");
      else toast.error("Notification permission denied");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const later = async () => {
    setLoading(true);
    try {
      await finish(false);
      track("reminder_consent", { enabled: false });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) setOpen(o); }}>
      <DialogContent className="max-w-sm rounded-[2rem] border-0 p-6" style={{ backgroundColor: "#fffdf6" }}>
        <DialogHeader className="items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(202,0,19,0.1)" }}>
            <Bell size={24} color="#ca0013" />
          </div>
          <DialogTitle className="text-xl font-black text-charcoal">Stay on Track with Nutrio</DialogTitle>
          <DialogDescription className="text-sm font-bold" style={{ color: "#6b7a76" }}>
            Would you like Nutrio to remind you to log your meals throughout the day?
            This helps you stay consistent with your calorie and macro goals.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={enable}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
            style={{ backgroundColor: "#ca0013" }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Enable Reminders
          </button>
          <button
            onClick={later}
            disabled={loading}
            className="rounded-2xl bg-white py-3 text-sm font-extrabold text-charcoal sage-border disabled:opacity-60"
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
