import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ACTIVE_SESSION_QUERY_KEY = ["form-settings", "active-session"] as const;

/** Returns the configured session, or null when missing/invalid. */
export function readActiveSession(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, unknown>).session;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  return /^\d{4}$/.test(s) ? s : null;
}

export function useActiveSession(enabled: boolean) {
  return useQuery({
    queryKey: ACTIVE_SESSION_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("form_settings")
        .select("setting_value").eq("setting_key", "active_session").maybeSingle();
      if (error) throw error;
      const session = readActiveSession(data?.setting_value);
      if (!session) throw new Error("Active session is not configured");
      return session;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
