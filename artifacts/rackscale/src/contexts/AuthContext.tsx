import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getCompany, type Company } from "@/lib/supabase-projects";

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  companyId: string | null;
  company: Company | null;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, companyName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function ensureProfile(user: User): Promise<{ companyId: string | null; error: string | null }> {
  if (!supabase) return { companyId: null, error: "Supabase is not configured." };

  const companyName: string =
    (user.user_metadata?.company_name as string | undefined)?.trim() ||
    (() => {
      const domain = (user.email ?? "").split("@")[1] ?? "company";
      return domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    })();

  const { data, error } = await supabase.rpc("create_company_and_profile", {
    p_company_name: companyName,
  });

  if (error) return { companyId: null, error: error.message };

  const result = data as { company_id: string } | null;
  return { companyId: result?.company_id ?? null, error: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const bootstrap = useCallback(async (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      const { companyId: cid, error } = await ensureProfile(s.user);
      setCompanyId(cid);
      setProfileError(error);
      if (cid) {
        try {
          const co = await getCompany(cid);
          setCompany(co);
        } catch {
          setCompany(null);
        }
      } else {
        setCompany(null);
      }
    } else {
      setCompanyId(null);
      setCompany(null);
      setProfileError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      bootstrap(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      bootstrap(s);
    });

    return () => subscription.unsubscribe();
  }, [bootstrap]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: "Authentication is not configured." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string, companyName: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: "Authentication is not configured." };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName } },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCompanyId(null);
    setCompany(null);
    setProfileError(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, companyId, company, profileError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
