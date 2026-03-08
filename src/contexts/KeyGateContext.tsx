import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface KeySession {
  valid: boolean;
  plan: "lite" | "pro" | null;
  username: string | null;
}

interface KeyGateContextType {
  session: KeySession;
  loading: boolean;
  validate: (key: string) => Promise<boolean>;
  logout: () => void;
}

const KeyGateContext = createContext<KeyGateContextType | undefined>(undefined);

export function KeyGateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<KeySession>({ valid: false, plan: null, username: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("access-key");
    if (stored) {
      validateKey(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const validateKey = async (key: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("validate_access_key", { _key: key });
      if (error) throw error;
      const result = data as unknown as KeySession;
      if (result.valid) {
        setSession(result);
        localStorage.setItem("access-key", key);
        return true;
      }
      setSession({ valid: false, plan: null, username: null });
      localStorage.removeItem("access-key");
      return false;
    } catch {
      setSession({ valid: false, plan: null, username: null });
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("access-key");
    setSession({ valid: false, plan: null, username: null });
  };

  return (
    <KeyGateContext.Provider value={{ session, loading, validate: validateKey, logout }}>
      {children}
    </KeyGateContext.Provider>
  );
}

export function useKeyGate() {
  const ctx = useContext(KeyGateContext);
  if (!ctx) throw new Error("useKeyGate must be within KeyGateProvider");
  return ctx;
}
