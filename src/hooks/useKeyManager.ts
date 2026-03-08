import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccessKey {
  id: string;
  key: string;
  username: string;
  plan: "lite" | "pro";
  active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string;
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
  return segments.join("-");
}

export function useKeyManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["access-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AccessKey[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async ({ username, plan, daysValid }: { username: string; plan: "lite" | "pro"; daysValid: number }) => {
      const expires = new Date();
      expires.setDate(expires.getDate() + daysValid);
      const { data, error } = await supabase.from("access_keys").insert({
        key: generateKey(),
        username,
        plan,
        active: true,
        created_by: user!.id,
        expires_at: expires.toISOString(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["access-keys"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("access_keys").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["access-keys"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("access_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["access-keys"] }),
  });

  return {
    keys,
    isLoading,
    createKey: (username: string, plan: "lite" | "pro", daysValid: number) =>
      createMutation.mutateAsync({ username, plan, daysValid }),
    toggleKey: (id: string, active: boolean) => toggleMutation.mutateAsync({ id, active }),
    deleteKey: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
  };
}
