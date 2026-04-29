import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  companyId: string | null;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, companyName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function ensureProfile(user: User): Promise<{ companyId: string | null; error: string | null }> {
  if (!supabase) return { companyId: null, error: "Supabase is not configured." };

  const { data: existing, error: selectErr } = await supabase
    .from("profiles")
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectErr) return { companyId: null, error: selectErr.message };
  if (existing?.company_id) return { companyId: existing.company_id, error: null };

  const companyName: string =
    (user.user_metadata?.company_name as string | undefined)?.trim() ||
    (() => {
      const domain = (user.email ?? "").split("@")[1] ?? "company";
      return domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    })();

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({ name: companyName })
    .select("id")
    .single();

  if (companyErr || !company) {
    return { companyId: null, error: companyErr?.message ?? "Failed to create company." };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .insert({ id: user.id, company_id: company.id, full_name: (user.user_metadata?.full_name as string | undefined) ?? null })
    .select("id, company_id")
    .single();

  if (profileErr || !profile) {
    return { companyId: null, error: profileErr?.message ?? "Failed to create profile." };
  }

  return { companyId: profile.company_id, error: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const bootstrap = useCallback(async (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      const { companyId: cid, error } = await ensureProfile(s.user);
      setCompanyId(cid);
      setProfileError(error);
    } else {
      setCompanyId(null);
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
    setProfileError(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, companyId, profileError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
