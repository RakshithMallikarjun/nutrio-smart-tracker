import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WeightLog = {
  id: string;
  weight_kg: number;
  log_date: string;
  note: string | null;
};

export type WeightUnit = "kg" | "lb";

export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
export const displayWeight = (kg: number, unit: WeightUnit) =>
  unit === "kg" ? kg : kgToLb(kg);

export function useWeightLogs(userId: string | undefined) {
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["weight-logs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weight_logs")
        .select("id,weight_kg,log_date,note")
        .eq("user_id", userId!)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        weight_kg: Number(r.weight_kg),
        log_date: String(r.log_date),
        note: r.note,
      })) as WeightLog[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const add = useMutation({
    mutationFn: async (input: { weight_kg: number; log_date: string; note?: string }) => {
      if (!userId) throw new Error("Unauthorized");
      const { data, error } = await supabase
        .from("weight_logs")
        .insert({ user_id: userId, ...input })
        .select("id,weight_kg,log_date,note")
        .single();
      if (error) throw error;
      return data as WeightLog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight-logs", userId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<{ weight_kg: number; log_date: string; note: string | null }> }) => {
      const { error } = await supabase.from("weight_logs").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight-logs", userId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight-logs", userId] }),
  });

  return {
    logs,
    isLoading,
    addWeight: add.mutateAsync,
    updateWeight: update.mutateAsync,
    deleteWeight: remove.mutateAsync,
  };
}
