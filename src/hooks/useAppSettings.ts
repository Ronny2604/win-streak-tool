import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ODDS_API_SETTING_KEY = "odds_api_key";

export function useAppSettings() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["app-setting", ODDS_API_SETTING_KEY],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value, updated_at")
        .eq("key", ODDS_API_SETTING_KEY)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: ODDS_API_SETTING_KEY,
          value,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-setting", ODDS_API_SETTING_KEY] });
    },
  });

  return {
    oddsApiKey: data?.value ?? "",
    oddsApiKeyUpdatedAt: data?.updated_at ?? null,
    isLoading,
    saveOddsApiKey: (value: string) => saveMutation.mutateAsync(value),
    isSaving: saveMutation.isPending,
  };
}
